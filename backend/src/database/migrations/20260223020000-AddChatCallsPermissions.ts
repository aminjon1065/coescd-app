import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data migration: patch existing role_permission_profiles rows so that
 * every role gains the chat.read / chat.write / calls.read / calls.write
 * permissions that were added to DEFAULT_ROLE_PERMISSIONS in Steps 6 & 7.
 *
 * Background: RolePermissionsService.hydrateFromDatabase() uses the DB as
 * the source of truth once a role row exists — it does NOT re-merge new code
 * defaults into existing rows.  This migration closes that gap so that any
 * already-running database picks up the new permissions on next restart.
 */
export class AddChatCallsPermissions20260223020000 implements MigrationInterface {
  name = 'AddChatCallsPermissions20260223020000';

  private readonly NEW_PERMISSIONS = [
    'chat.read',
    'chat.write',
    'calls.read',
    'calls.write',
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: number; permissions: string[] }> =
      await queryRunner.query(
        `SELECT id, permissions FROM role_permission_profiles`,
      );

    for (const row of rows) {
      const current: string[] = Array.isArray(row.permissions)
        ? row.permissions
        : JSON.parse(row.permissions as unknown as string);

      const updated = [
        ...new Set([...current, ...this.NEW_PERMISSIONS]),
      ];

      if (updated.length !== current.length) {
        await queryRunner.query(
          `UPDATE role_permission_profiles SET permissions = $1::json WHERE id = $2`,
          [JSON.stringify(updated), row.id],
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: number; permissions: string[] }> =
      await queryRunner.query(
        `SELECT id, permissions FROM role_permission_profiles`,
      );

    for (const row of rows) {
      const current: string[] = Array.isArray(row.permissions)
        ? row.permissions
        : JSON.parse(row.permissions as unknown as string);

      const reverted = current.filter(
        (p) => !this.NEW_PERMISSIONS.includes(p),
      );

      await queryRunner.query(
        `UPDATE role_permission_profiles SET permissions = $1::json WHERE id = $2`,
        [JSON.stringify(reverted), row.id],
      );
    }
  }
}
