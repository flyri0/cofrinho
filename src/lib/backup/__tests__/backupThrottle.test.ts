import { shouldRunAutoBackup } from '../backupThrottle';

describe('shouldRunAutoBackup', () => {
  it('runs when never backed up before (normal first-run case)', () => {
    expect(
      shouldRunAutoBackup({
        autoBackupEnabled: true,
        isConnected: true,
        lastBackupAt: null,
        now: new Date('2026-05-10T12:00:00Z'),
      }),
    ).toBe(true);
  });

  it('does not run again inside the same rolling 24h window', () => {
    expect(
      shouldRunAutoBackup({
        autoBackupEnabled: true,
        isConnected: true,
        lastBackupAt: new Date('2026-05-10T00:00:00Z'),
        now: new Date('2026-05-10T23:59:59Z'),
      }),
    ).toBe(false);
  });

  it('runs again once 24h have elapsed (edge case: exact boundary)', () => {
    expect(
      shouldRunAutoBackup({
        autoBackupEnabled: true,
        isConnected: true,
        lastBackupAt: new Date('2026-05-10T00:00:00Z'),
        now: new Date('2026-05-11T00:00:00Z'),
      }),
    ).toBe(true);
  });

  it('never runs when the toggle is off, regardless of elapsed time', () => {
    expect(
      shouldRunAutoBackup({
        autoBackupEnabled: false,
        isConnected: true,
        lastBackupAt: null,
        now: new Date('2026-05-10T12:00:00Z'),
      }),
    ).toBe(false);
  });

  it('never runs when not connected to Google Drive', () => {
    expect(
      shouldRunAutoBackup({
        autoBackupEnabled: true,
        isConnected: false,
        lastBackupAt: null,
        now: new Date('2026-05-10T12:00:00Z'),
      }),
    ).toBe(false);
  });
});
