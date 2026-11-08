import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const UPLOAD_URL_PREFIX = '/api/uploads/';

export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

// Detects the real format from magic bytes so a renamed non-image can never be stored.
export const detectImageExtension = (buffer: Buffer): 'jpg' | 'png' | 'webp' | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
};

export const saveUploadedImage = async (buffer: Buffer) => {
  const extension = detectImageExtension(buffer);
  if (!extension) return null;
  await fs.promises.mkdir(uploadDir(), { recursive: true });
  const name = `${randomUUID()}.${extension}`;
  await fs.promises.writeFile(path.join(uploadDir(), name), buffer, { mode: 0o644 });
  return `${UPLOAD_URL_PREFIX}${name}`;
};

export const removeUploadedImage = async (url: string) => {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return;
  const name = path.basename(url.slice(UPLOAD_URL_PREFIX.length));
  await fs.promises.rm(path.join(uploadDir(), name), { force: true });
};
