import multer from 'multer';
import path from 'path';
import { ApiError } from './error.middleware.js';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Multer in MEMORY mode — the file buffer is handed to storage.service's
 * putFile(), which persists it to Cloudinary (prod) or local disk (dev). This
 * keeps the two storage backends behind one seam instead of committing every
 * upload route to the local filesystem.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return cb(new ApiError(422, `File type ${ext} not allowed (jpg, png, webp, pdf only)`));
    }
    cb(null, true);
  },
});
