import { BACKUP_EXPORT_VERSION, buildBackupExport } from '../buildBackupExport';

describe('buildBackupExport', () => {
  it('wraps every table under a versioned, timestamped envelope', () => {
    const now = new Date('2026-05-10T12:00:00.000Z');
    const result = buildBackupExport(
      {
        accounts: [{ id: 1, name: 'Checking' }],
        categories: [],
      },
      now,
    );

    expect(result).toEqual({
      version: BACKUP_EXPORT_VERSION,
      exportedAt: '2026-05-10T12:00:00.000Z',
      tables: {
        accounts: [{ id: 1, name: 'Checking' }],
        categories: [],
      },
    });
  });

  it('handles an entirely empty database (fresh install edge case)', () => {
    const result = buildBackupExport({}, new Date('2026-01-01T00:00:00.000Z'));
    expect(result.tables).toEqual({});
  });
});
