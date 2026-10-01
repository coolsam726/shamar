import type { ApplicationService } from '@adonisjs/core/types';
import mongoose from 'mongoose';

/**
 * Opens the default Mongoose connection before the Shamar panel boots.
 * The app owns the URI (`MONGO_URI` in `.env`). This provider only connects.
 */
export default class MongoProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
      throw new Error('MONGO_URI is not set. Add it to .env and start/env.ts.');
    }
    mongoose.set('strictQuery', true);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  }

  async shutdown() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}
