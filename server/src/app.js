import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { corsOrigins, isProduction, isTest } from './config/env.js';

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
import expenseRoutes from './routes/expense.routes.js';
import leadRoutes from './routes/lead.routes.js';
import settlementRoutes from './routes/settlement.routes.js';

import { errorHandler, notFound } from './middleware/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Trust the first proxy hop (nginx / Render / Vercel) so req.ip, rate-limiting
// and secure cookies work correctly behind a reverse proxy.
app.set('trust proxy', 1);

// ── Security & parsing ────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
if (!isTest) app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(
  cors({
    origin: corsOrigins(),
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb', parameterLimit: 100 }));
app.use(cookieParser());

// Rate limiting (disabled under test to keep suites deterministic).
if (!isTest) {
  // Broad guard across the whole API.
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests — please slow down.' },
  }));
  // Stricter brute-force guard on auth endpoints.
  app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts — try again in 15 minutes.' },
  }));
}

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
app.use('/api/expenses', expenseRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/settlements', settlementRoutes);

// ── Errors ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
