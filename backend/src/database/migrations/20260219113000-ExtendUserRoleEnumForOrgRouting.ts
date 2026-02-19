import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendUserRoleEnumForOrgRouting20260219113000
  implements MigrationInterface
{
  name = 'ExtendUserRoleEnumForOrgRouting20260219113000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
          BEGIN
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'chairperson';
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'first_deputy';
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'deputy';
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'department_head';
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'division_head';
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'chancellery';
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'employee';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum value removal is not supported safely in-place.
  }
}
