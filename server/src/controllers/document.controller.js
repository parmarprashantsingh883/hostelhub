import Document from '../models/Document.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';
import { putFile, deleteFile } from '../services/storage.service.js';

/** POST /api/documents (admin) — multipart: file + userId + documentType */
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(422, 'No file uploaded');
  const fileUrl = await putFile({ buffer: req.file.buffer, originalname: req.file.originalname, mimetype: req.file.mimetype, folder: 'documents' });
  const doc = await Document.create({
    userId: req.body.userId,
    documentType: req.body.documentType,
    fileUrl,
    fileName: req.file.originalname,
    uploadedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { document: doc } });
});

/** GET /api/documents?userId= — admin sees any; tenant/staff see their own */
export const listDocuments = asyncHandler(async (req, res) => {
  const q = {};
  if (req.user.role === 'admin') {
    if (req.query.userId) q.userId = req.query.userId;
  } else {
    q.userId = req.user._id;
  }
  const documents = await Document.find(q)
    .populate('userId', 'name role')
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { documents } });
});

/** DELETE /api/documents/:id (admin) */
export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Document not found');

  await deleteFile(doc.fileUrl); // best-effort (local unlink or Cloudinary destroy)
  await doc.deleteOne();
  res.json({ success: true, message: 'Document deleted' });
});
