import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestrictAnalyticsAccessToAnalysts20260401120000
  implements MigrationInterface
{
  name = 'RestrictAnalyticsAccessToAnalysts20260401120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "role_permission_profiles"
      SET "permissions" = (
        SELECT COALESCE(json_agg(permission), '[]'::json)
        FROM json_array_elements_text(COALESCE("permissions", '[]'::json)) AS permission
        WHERE permission NOT IN ('analytics.read', 'analytics.write', 'reports.read', 'reports.generate')
      )
      WHERE "role" NOT IN ('admin', 'analyst')
    `);
  }

  public async down(): Promise<void> {
    // Non-destructive on rollback. Permissions can be reconfigured through the admin matrix.
  }
}
