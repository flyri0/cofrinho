// CLAUDE.md: "The Google Drive integration must request ONLY the drive.file
// OAuth scope. Never request full Drive access (drive or drive.readonly
// scopes), even if it seems to simplify implementation." This is the single
// place that constant is defined — every auth request in this app must import
// GOOGLE_DRIVE_SCOPES from here rather than listing scope strings inline, so
// the scope actually requested can always be audited in one spot.
//
// Deliberately excludes 'openid'/'.../userinfo.email'/'.../userinfo.profile'
// too: the "Connected as [email]" UI (§6.3) is served instead by Drive's own
// `about.get` endpoint (see driveApi.ts's fetchConnectedAccountEmail), which
// works under drive.file alone and needs no extra identity scope.
export const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const GOOGLE_DRIVE_SCOPES: readonly string[] = [GOOGLE_DRIVE_FILE_SCOPE];
