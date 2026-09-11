import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

// Driver-agnostic type for a Drizzle db bound to our schema — satisfied by both
// the real expo-sqlite client (db/client.ts) and any other 'sync' SQLite driver
// (e.g. better-sqlite3 in tests). Keeping it here, separate from client.ts, lets
// code that only needs the type avoid importing the native expo-sqlite module.
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
