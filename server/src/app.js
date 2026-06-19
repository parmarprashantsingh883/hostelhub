import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import staffRoutes from './routes/staff.routes.js';
import rentRoutes from './routes/rent.routes.js';
import complaintRoutes from './routes/complaint.routes.js';
import noticeRoutes from './routes/notice.routes.js';
import visitorRoutes from './routes/visitor.routes.js';
import foodMenuRoutes from './routes/foodMenu.routes.js';
import documentRoutes from './routes/document.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

import { errorHandler, notFound } from './middleware/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Security & parsing ────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate-limit auth endpoints (brute-force guard)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts — try again in 15 minutes.' },
});
app.use('/api/auth', authLimiter);

// Static uploads (dev local storage; swap for Cloudinary in prod)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/rents', rentRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/food-menu', foodMenuRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Errors ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
