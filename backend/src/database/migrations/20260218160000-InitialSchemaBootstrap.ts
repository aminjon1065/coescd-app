import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaBootstrap20260218160000
  implements MigrationInterface
{
  name = 'InitialSchemaBootstrap20260218160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUserTable = await queryRunner.hasTable('user');
    if (hasUserTable) {
      return;
    }

    // One-time bootstrap for empty databases: materialize the baseline schema
    // from current entities, then follow-up incremental migrations apply safely.
    await queryRunner.connection.synchronize(false);
  }

  public async down(): Promise<void> {
    // Intentionally no-op. Reverting bootstrap would be destructive.
  }
}
