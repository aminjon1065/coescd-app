import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
// @mapbox/tilebelt: tileToBBOX converts z/x/y to [west, south, east, north]
import { tileToBBOX } from '@mapbox/tilebelt';

@Injectable()
export class TileService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  async getBoundaryTile(z: number, x: number, y: number): Promise<Buffer | null> {
    const cacheKey = `tile:boundaries:${z}:${x}:${y}`;
    const cached = await this.redis.getBuffer(cacheKey);
    if (cached) return cached;

    const bbox = tileToBBOX([x, y, z]) as [number, number, number, number];
    const level = this.zoomToLevel(z);

    const result = await this.dataSource.query(`
      SELECT ST_AsMVT(q, 'boundaries', 4096, 'geom') AS tile
      FROM (
        SELECT code, name_ru, level,
          ST_AsMVTGeom(
            boundary,
            ST_MakeEnvelope($1, $2, $3, $4, 4326),
            4096, 64, true
          ) AS geom
        FROM anl_geo_boundaries
        WHERE boundary && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND level = $5
      ) q
    `, [bbox[0], bbox[1], bbox[2], bbox[3], level]);

    const tile: Buffer = result[0]?.tile ?? Buffer.alloc(0);

    if (tile.length > 0) {
      await this.redis.setex(cacheKey, 3600, tile);
    }

    return tile;
  }

  async getRiskZoneTile(z: number, x: number, y: number): Promise<Buffer | null> {
    const cacheKey = `tile:risk_zones:${z}:${x}:${y}`;
    const cached = await this.redis.getBuffer(cacheKey);
    if (cached) return cached;

    const bbox = tileToBBOX([x, y, z]) as [number, number, number, number];

    const result = await this.dataSource.query(`
      SELECT ST_AsMVT(q, 'risk_zones', 4096, 'geom') AS tile
      FROM (
        SELECT id::text, name, risk_type, severity::int,
          ST_AsMVTGeom(
            geometry,
            ST_MakeEnvelope($1, $2, $3, $4, 4326),
            4096, 64, true
          ) AS geom
        FROM anl_geo_risk_zones
        WHERE geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      ) q
    `, [bbox[0], bbox[1], bbox[2], bbox[3]]);

    const tile: Buffer = result[0]?.tile ?? Buffer.alloc(0);
    if (tile.length > 0) await this.redis.setex(cacheKey, 3600, tile);
    return tile;
  }

  async invalidateLayer(layer: string) {
    const keys = await this.redis.keys(`tile:${layer}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  private zoomToLevel(z: number): string {
    if (z <= 5) return 'country';
    if (z <= 7) return 'oblast';
    if (z <= 9) return 'rayon';
    return 'city';
  }
}
