import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { putFile, deleteFile, storageMode } from '../src/services/storage.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const written = [];

afterAll(() => {
  // clean up anything the local-mode tests wrote to disk
  written.forEach((url) => {
    const p = path.join(__dirname, '..', 'src', url);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
});

describe('storage service (local mode, no Cloudinary keys)', () => {
  it('falls back to local disk when no Cloudinary env is set', () => {
    expect(storageMode()).toBe('local');
  });

  it('putFile writes the buffer and returns a /uploads URL under the folder', async () => {
    const url = await putFile({
      buffer: Buffer.from('hello-bytes'),
      originalname: 'photo.png',
      mimetype: 'image/png',
      folder: 'avatars',
    });
    written.push(url);
    expect(url).toMatch(/^\/uploads\/avatars\/\d+-\d+\.png$/);
    const onDisk = path.join(__dirname, '..', 'src', url);
    expect(fs.existsSync(onDisk)).toBe(true);
    expect(fs.readFileSync(onDisk, 'utf8')).toBe('hello-bytes');
  });

  it('preserves the file extension for PDFs', async () => {
    const url = await putFile({ buffer: Buffer.from('%PDF-1.4'), originalname: 'id.pdf', mimetype: 'application/pdf', folder: 'documents' });
    written.push(url);
    expect(url).toMatch(/\.pdf$/);
  });

  it('deleteFile removes a local file (best-effort, no throw on missing)', async () => {
    const url = await putFile({ buffer: Buffer.from('x'), originalname: 'tmp.png', folder: 'documents' });
    const onDisk = path.join(__dirname, '..', 'src', url);
    expect(fs.existsSync(onDisk)).toBe(true);
    await deleteFile(url);
    // unlink is async best-effort; give it a tick
    await new Promise((r) => setTimeout(r, 50));
    expect(fs.existsSync(onDisk)).toBe(false);
    await expect(deleteFile('/uploads/documents/does-not-exist.png')).resolves.toBeUndefined();
    await expect(deleteFile(undefined)).resolves.toBeUndefined();
  });
});
