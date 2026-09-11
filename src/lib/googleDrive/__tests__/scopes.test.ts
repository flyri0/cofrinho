import { GOOGLE_DRIVE_FILE_SCOPE, GOOGLE_DRIVE_SCOPES } from '../scopes';

// CLAUDE.md: this is a deliberate, non-negotiable security decision — a
// regression test, not a formality. If this ever fails, someone widened the
// scope; that should never happen "for convenience".
describe('Google Drive OAuth scope', () => {
  it('requests exactly one scope: drive.file', () => {
    expect(GOOGLE_DRIVE_SCOPES).toEqual(['https://www.googleapis.com/auth/drive.file']);
  });

  it('never includes the full drive or drive.readonly scopes', () => {
    expect(GOOGLE_DRIVE_SCOPES).not.toContain('https://www.googleapis.com/auth/drive');
    expect(GOOGLE_DRIVE_SCOPES).not.toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(GOOGLE_DRIVE_SCOPES).not.toContain('https://www.googleapis.com/auth/drive.appdata');
  });

  it('never includes identity scopes (email/profile/openid) — not needed for drive.file', () => {
    for (const scope of GOOGLE_DRIVE_SCOPES) {
      expect(scope).not.toMatch(/openid|userinfo|profile|email/);
    }
  });

  it('exports the exact scope string used everywhere else', () => {
    expect(GOOGLE_DRIVE_FILE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file');
  });
});
