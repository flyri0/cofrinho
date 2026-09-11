import type { DriveFolderMode } from '@/db/schema';

// see technical-specification.md §4.10/§6.3 — "Backup location on Drive" toggles
// between a hidden folder (`app_data_folder`) and a visible one at Drive's root.
//
// IMPORTANT CAVEAT: Google's real hidden "Application Data" folder (the special
// `appDataFolder` parent alias) requires the `drive.appdata` OAuth scope — it is
// NOT accessible under `drive.file`, which this app deliberately uses exclusively
// (see CLAUDE.md and src/lib/googleDrive/scopes.ts). Since we never request
// `drive.appdata`, 'app_data_folder' mode cannot actually be hidden from the
// user's Drive UI the way the spec describes; both modes create an ordinary,
// user-visible folder via `drive.file`, differing only in name. This is a
// disclosed, deliberate limitation — not a bug — and is surfaced to the user in
// the Backup settings screen.
const FOLDER_NAMES: Record<DriveFolderMode, string> = {
  app_data_folder: 'Cofrinho (app data)',
  visible_folder: 'Cofrinho',
};

export function resolveDriveFolderName(mode: DriveFolderMode): string {
  return FOLDER_NAMES[mode];
}
