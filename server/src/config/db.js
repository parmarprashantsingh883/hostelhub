import mongoose from 'mongoose';

/**
 * Connect to MongoDB.
 * Dev convenience: when USE_MEMORY_DB=true (or MONGO_URI is empty), spin up
 * an in-memory MongoDB via mongodb-memory-server so the project runs without
 * a local Mongo install or an Atlas account. Data resets on restart — run
 * `npm run seed` after boot, or set SEED_ON_BOOT=true.
 */
export async function connectDB() {
  let uri = process.env.MONGO_URI;

  if (process.env.USE_MEMORY_DB === 'true' || !uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('hostelhub');
    console.log('⚡ Using in-memory MongoDB (dev mode):', uri);
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
}
