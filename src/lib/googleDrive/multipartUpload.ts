// Builds the request body for the Drive API v3's multipart upload
// (`uploadType=multipart`): a metadata JSON part followed by the file content
// part, separated by a boundary string. See:
// https://developers.google.com/drive/api/guides/manage-uploads#multipart
const BOUNDARY = 'cofrinho-backup-boundary';

export interface MultipartUploadInput {
  metadata: Record<string, unknown>;
  content: string;
  contentType: string;
}

export interface MultipartUploadOutput {
  body: string;
  /** Value for the request's own Content-Type header (distinct from the content part's contentType above). */
  requestContentType: string;
}

export function buildMultipartUploadBody({
  metadata,
  content,
  contentType,
}: MultipartUploadInput): MultipartUploadOutput {
  const body =
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${BOUNDARY}\r\n` +
    `Content-Type: ${contentType}\r\n\r\n` +
    `${content}\r\n` +
    `--${BOUNDARY}--`;

  return { body, requestContentType: `multipart/related; boundary=${BOUNDARY}` };
}
