import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

const isTsRuntime = __filename.endsWith('.ts');
const migrationsDir = join(__dirname, 'migrations');

const migrationFiles = (() => {
  try {
    return readdirSync(migrationsDir)
      .filter((file) => (isTsRuntime ? file.endsWith('.ts') : file.endsWith('.js')))
      .filter((file) => !file.includes('AutoMigration'))
      .map((file) => join(migrationsDir, file))
      .filter((file) => {
        try {
          return statSync(file).isFile();
        } catch {
          return false;
        }
      });
  } catch {
    return isTsRuntime
      ? ['src/database/migrations/*.ts']
      : ['dist/database/migrations/*.js'];
  }
})();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'coescd',
  entities: isTsRuntime ? ['src/**/*.entity.ts'] : ['dist/**/*.entity.js'],
  migrations: migrationFiles,
  synchronize: false,
});
