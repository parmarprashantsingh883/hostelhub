import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { validateEnv } from './config/env.js';

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    validateEnv();
    await connectDB();

    // Optional: auto-seed when running the in-memory DB so the demo
    // credentials always exist after a restart.
    if (process.env.USE_MEMORY_DB === 'true' || process.env.SEED_ON_BOOT === 'true') {
      const { runSeed } = await import('./seed/seed.js');
      await runSeed({ exitAfter: false });
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 Quarters API running at http://localhost:${PORT}`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────
    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`\n${signal} received — shutting down gracefully…`);
      server.close(async () => {
        try {
          await mongoose.connection.close();
        } catch { /* ignore */ }
        console.log('✅ Closed out connections. Bye.');
        process.exit(0);
      });
      // Force-exit if connections don't drain in time.
      setTimeout(() => {
        console.error('⏱️  Forced shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    ['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
    });
    // A synchronous error that escapes all handlers leaves the process in an
    // undefined state — log it and shut down cleanly rather than limp on.
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      shutdown('uncaughtException');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
