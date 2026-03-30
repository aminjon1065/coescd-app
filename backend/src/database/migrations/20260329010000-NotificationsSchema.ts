import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationsSchema20260329010000 implements MigrationInterface {
  name = 'NotificationsSchema20260329010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"         SERIAL PRIMARY KEY,
        "user_id"    INTEGER NOT NULL
                       REFERENCES "user"("id") ON DELETE CASCADE,
        "kind"       VARCHAR(64) NOT NULL,
        "message"    TEXT NOT NULL,
        "payload"    JSONB DEFAULT NULL,
        "read_at"    TIMESTAMPTZ DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Index: fast unread count per user
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_unread"
        ON "notifications" ("user_id", "created_at" DESC)
        WHERE "read_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_created"
        ON "notifications" ("user_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
