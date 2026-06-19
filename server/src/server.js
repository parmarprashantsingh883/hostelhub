import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();

    // Optional: auto-seed when running the in-memory DB so the demo
    // credentials always exist after a restart.
    if (process.env.USE_MEMORY_DB === 'true' || process.env.SEED_ON_BOOT === 'true') {
      const { runSeed } = await import('./seed/seed.js');
      await runSeed({ exitAfter: false });
    }

    app.listen(PORT, () => {
      console.log(`🚀 HostelHub API running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
