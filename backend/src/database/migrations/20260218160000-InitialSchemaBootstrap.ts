import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaBootstrap20260218160000
  implements MigrationInterface
{
  name = 'InitialSchemaBootstrap20260218160000';

  public async up(): Promise<void> {
    // Legacy compatibility migration. Intentionally no-op.
    // Explicit baseline schema is now provided by:
    // `20260218165000-CoreDomainExplicitBaseline`.
    // Implicit synchronize-based bootstrap is deprecated for production safety.
  }

  public async down(): Promise<void> {
    // Intentionally no-op. Reverting bootstrap would be destructive.
  }
}
