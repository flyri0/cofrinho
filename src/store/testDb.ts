import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from '@/db/schema';
import type { AppDatabase } from '@/db/types';

// Test-only helper (not imported by any production code, so better-sqlite3 never
// reaches the app bundle). Applies every committed migration to a fresh in-memory
// database, so store tests exercise the same schema the real app runs.
export function createTestDatabase(): AppDatabase {
  const sqlite = new Database(':memory:');
  const drizzleDir = path.join(__dirname, '../drizzle');
  const migrationFiles = fs
    .readdirSync(drizzleDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    sqlite.exec(fs.readFileSync(path.join(drizzleDir, file), 'utf-8'));
  }

  return drizzle(sqlite, { schema }) as unknown as AppDatabase;
}
