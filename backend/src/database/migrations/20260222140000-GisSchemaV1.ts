import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class GisSchemaV120260222140000 implements MigrationInterface {
  name = 'GisSchemaV120260222140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── gis_layers ──────────────────────────────────────────────────────────
    const hasLayers = await queryRunner.hasTable('gis_layers');
    if (!hasLayers) {
      await queryRunner.createTable(
        new Table({
          name: 'gis_layers',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'name', type: 'varchar' },
            {
              name: 'type',
              type: 'enum',
              enum: ['incident', 'zone', 'resource', 'route', 'checkpoint'],
              default: "'incident'",
            },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'department_id', type: 'int', isNullable: true },
            { name: 'created_by', type: 'int', isNullable: true },
            { name: 'is_active', type: 'boolean', default: true },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );

      if (await queryRunner.hasTable('departments')) {
        await queryRunner.createForeignKey(
          'gis_layers',
          new TableForeignKey({
            columnNames: ['department_id'],
            referencedTableName: 'departments',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        );
      }
      if (await queryRunner.hasTable('user')) {
        await queryRunner.createForeignKey(
          'gis_layers',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedTableName: 'user',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        );
      }

      await queryRunner.createIndices('gis_layers', [
        new TableIndex({ name: 'IDX_GIS_LAYERS_DEPT_ACTIVE', columnNames: ['department_id', 'is_active'] }),
        new TableIndex({ name: 'IDX_GIS_LAYERS_TYPE', columnNames: ['type'] }),
      ]);
    }

    // ── gis_features ────────────────────────────────────────────────────────
    const hasFeatures = await queryRunner.hasTable('gis_features');
    if (!hasFeatures) {
      await queryRunner.createTable(
        new Table({
          name: 'gis_features',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'layer_id', type: 'int', isNullable: true },
            { name: 'title', type: 'varchar' },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'latitude', type: 'double precision' },
            { name: 'longitude', type: 'double precision' },
            { name: 'geometry', type: 'jsonb', isNullable: true },
            {
              name: 'severity',
              type: 'enum',
              enum: ['low', 'medium', 'high', 'critical'],
              default: "'medium'",
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['active', 'resolved', 'monitoring', 'archived'],
              default: "'active'",
            },
            { name: 'properties', type: 'jsonb', isNullable: true },
            { name: 'department_id', type: 'int', isNullable: true },
            { name: 'created_by', type: 'int', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'gis_features',
        new TableForeignKey({
          columnNames: ['layer_id'],
          referencedTableName: 'gis_layers',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
      if (await queryRunner.hasTable('departments')) {
        await queryRunner.createForeignKey(
          'gis_features',
          new TableForeignKey({
            columnNames: ['department_id'],
            referencedTableName: 'departments',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        );
      }
      if (await queryRunner.hasTable('user')) {
        await queryRunner.createForeignKey(
          'gis_features',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedTableName: 'user',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        );
      }

      await queryRunner.createIndices('gis_features', [
        new TableIndex({
          name: 'IDX_GIS_FEATURES_STATUS_SEVERITY',
          columnNames: ['status', 'severity'],
        }),
        new TableIndex({
          name: 'IDX_GIS_FEATURES_DEPT_STATUS',
          columnNames: ['department_id', 'status'],
        }),
        new TableIndex({
          name: 'IDX_GIS_FEATURES_LAT_LNG',
          columnNames: ['latitude', 'longitude'],
        }),
        new TableIndex({
          name: 'IDX_GIS_FEATURES_CREATED_AT',
          columnNames: ['created_at'],
        }),
        new TableIndex({
          name: 'IDX_GIS_FEATURES_LAYER_STATUS',
          columnNames: ['layer_id', 'status'],
        }),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('gis_features')) {
      await queryRunner.dropTable('gis_features', true, true, true);
    }
    if (await queryRunner.hasTable('gis_layers')) {
      await queryRunner.dropTable('gis_layers', true, true, true);
    }
  }
}
