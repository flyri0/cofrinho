import { buildMultipartUploadBody } from './multipartUpload';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export class DriveApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'DriveApiError';
  }
}

async function driveFetch(url: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new DriveApiError(
      `Drive API request failed (${response.status}): ${body}`,
      response.status,
    );
  }
  return response;
}

// Note: under `drive.file` scope, `files.list` only ever sees files/folders
// this app itself created (§ CLAUDE.md's scope restriction is exactly what
// causes this) — so this search can never collide with some other unrelated
// folder the user happens to have named the same thing.
async function findFolder(accessToken: string, folderName: string): Promise<string | null> {
  const query = encodeURIComponent(
    `mimeType='${FOLDER_MIME_TYPE}' and name='${folderName}' and trashed=false`,
  );
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${query}&fields=files(id)`,
    accessToken,
  );
  const json = (await response.json()) as { files: { id: string }[] };
  return json.files[0]?.id ?? null;
}

async function createFolder(accessToken: string, folderName: string): Promise<string> {
  const response = await driveFetch(`${DRIVE_API_BASE}/files`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: FOLDER_MIME_TYPE }),
  });
  const json = (await response.json()) as { id: string };
  return json.id;
}

// Find-or-create, mirroring the pattern already used for the credit card
// payment category (see src/store/accountsStore.ts's ensureCreditCardPaymentCategory).
export async function ensureBackupFolder(accessToken: string, folderName: string): Promise<string> {
  const existing = await findFolder(accessToken, folderName);
  if (existing) return existing;
  return createFolder(accessToken, folderName);
}

export async function uploadBackupFile(
  accessToken: string,
  folderId: string,
  filename: string,
  jsonContent: string,
): Promise<void> {
  const { body, requestContentType } = buildMultipartUploadBody({
    metadata: { name: filename, parents: [folderId] },
    content: jsonContent,
    contentType: 'application/json',
  });

  await driveFetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': requestContentType },
    body,
  });
}

// Drive's own `about.get` reports on the CURRENTLY AUTHORIZED user and works
// under any Drive scope, including `drive.file` — unlike a generic OAuth
// userinfo/identity endpoint, it needs no extra 'email'/'profile'/'openid'
// scope. This is how "Connected as [email]" (§6.3) is shown without widening
// the OAuth scope beyond drive.file.
export async function fetchConnectedAccountEmail(accessToken: string): Promise<string | null> {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/about?fields=${encodeURIComponent('user(emailAddress)')}`,
    accessToken,
  );
  const json = (await response.json()) as { user?: { emailAddress?: string } };
  return json.user?.emailAddress ?? null;
}
