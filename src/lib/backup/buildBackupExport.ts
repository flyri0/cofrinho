// see technical-specification.md §7.6 — "exports the database (.db file or JSON
// export)". A JSON export of every row, table by table, was chosen over a raw
// copy of the SQLite file: expo-sqlite may run in WAL journal mode, so a plain
// filesystem copy of the .db file while the app holds it open is not guaranteed
// to be a consistent snapshot without an explicit checkpoint step that isn't
// exposed to JS. Reading every row through the already-open Drizzle connection
// (the same one every other store already trusts for consistency) sidesteps
// that risk entirely, at the cost of a little serialization code here.
//
// The OAuth token is deliberately NOT part of this export — it never touches
// SQLite at all (see src/lib/googleDrive/tokenStorage.ts, which uses
// expo-secure-store instead) specifically so a backup file can never leak it.
export const BACKUP_EXPORT_VERSION = 1;

// One array of rows per table; kept as a generic record (rather than importing
// each table's row type from db/schema) so this pure module doesn't need to
// know the schema's exact shape — the caller (backupStore.ts) already has
// fully-typed rows from Drizzle and just passes them through untouched.
export type BackupExportTables = Record<string, Record<string, unknown>[]>;

export interface BackupExport {
  version: number;
  exportedAt: string;
  tables: BackupExportTables;
}

export function buildBackupExport(tables: BackupExportTables, now: Date): BackupExport {
  return {
    version: BACKUP_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    tables,
  };
}
