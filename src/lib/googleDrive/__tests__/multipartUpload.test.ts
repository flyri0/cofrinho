import { buildMultipartUploadBody } from '../multipartUpload';

describe('buildMultipartUploadBody', () => {
  it('builds a well-formed multipart/related body with a metadata part and a content part', () => {
    const result = buildMultipartUploadBody({
      metadata: { name: 'backup.json', parents: ['folder-id'] },
      content: '{"foo":"bar"}',
      contentType: 'application/json',
    });

    expect(result.requestContentType).toMatch(/^multipart\/related; boundary=.+/);
    const boundary = result.requestContentType.split('boundary=')[1];

    const parts = result.body.split(`--${boundary}`);
    // ['', metadataPart, contentPart, '--'] — split on the boundary marker itself
    expect(parts).toHaveLength(4);
    expect(parts[1]).toContain('Content-Type: application/json; charset=UTF-8');
    expect(parts[1]).toContain('{"name":"backup.json","parents":["folder-id"]}');
    expect(parts[2]).toContain('Content-Type: application/json');
    expect(parts[2]).toContain('{"foo":"bar"}');
    expect(result.body.endsWith(`--${boundary}--`)).toBe(true);
  });

  it('preserves the exact content string, including special characters', () => {
    const result = buildMultipartUploadBody({
      metadata: { name: 'backup.json' },
      content: 'line one\nline "two"',
      contentType: 'application/json',
    });
    expect(result.body).toContain('line one\nline "two"');
  });
});
