import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * File storage adapter — same mock-first pattern as payment/email/messaging.
 *
 *   cloud mode  → Cloudinary (secure_url survives restarts & redeploys)
 *   local mode  → server/src/uploads/<folder>, served at /uploads/... (dev)
 *
 * Enabled when CLOUDINARY_URL (or the three discrete vars) is set. Without it,
 * uploads write to local disk so dev/tests work with zero config. Ephemeral
 * cloud hosts (Render/Vercel) wipe local disk on restart — set the keys in
 * production so avatars, ID documents and complaint photos persist.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const hasCloudinary = () =>
  !!(process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));

export const storageMode = () => (hasCloudinary() ? 'cloudinary' : 'local');

let _cld = null;
async function cloudinary() {
  if (_cld) return _cld;
  const c = (await import('cloudinary')).v2;
  // CLOUDINARY_URL is auto-parsed by the SDK; else configure from discrete vars.
  if (!process.env.CLOUDINARY_URL) {
    c.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  _cld = c;
  return c;
}

const isPdf = (name, mime) => (mime || '').includes('pdf') || /\.pdf$/i.test(name || '');
const randomName = (originalname) => `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalname || '').toLowerCase()}`;

/**
 * Persist an uploaded file buffer, return a stable URL string.
 * @param {{ buffer: Buffer, originalname?: string, mimetype?: string, folder?: string }} file
 */
export async function putFile({ buffer, originalname, mimetype, folder = 'misc' }) {
  if (storageMode() === 'cloudinary') {
    const c = await cloudinary();
    return new Promise((resolve, reject) => {
      const stream = c.uploader.upload_stream(
        { folder: `quarters/${folder}`, resource_type: isPdf(originalname, mimetype) ? 'raw' : 'image' },
        (err, result) => (err ? reject(err) : resolve(result.secure_url)),
      );
      stream.end(buffer);
    });
  }
  const dir = path.join(UPLOAD_ROOT, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const name = randomName(originalname);
  fs.writeFileSync(path.join(dir, name), buffer);
  return `/uploads/${folder}/${name}`;
}

/** Best-effort delete of a URL returned by putFile (local unlink or Cloudinary destroy). */
export async function deleteFile(url) {
  if (!url) return;
  if (url.startsWith('/uploads/')) {
    fs.unlink(path.join(__dirname, '..', url), () => {}); // best-effort
    return;
  }
  if (url.includes('res.cloudinary.com') && hasCloudinary()) {
    try {
      const c = await cloudinary();
      const m = url.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
      if (!m) return;
      const publicId = m[2].replace(/\.[^/.]+$/, ''); // strip extension
      await c.uploader.destroy(publicId, { resource_type: m[1] });
    } catch { /* best-effort */ }
  }
}
