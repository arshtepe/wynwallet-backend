import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let connection = null;
let db = null;

export const initializeDatabase = async () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required PostgreSQL environment variables: ${missingVars.join(', ')}\n` +
        `Please set them in your .env file or environment variables.`
      );
    }

    console.log(`Connecting to PostgreSQL database: ${process.env.POSTGRES_DB}@${process.env.POSTGRES_HOST}`);
    console.log(`User: ${process.env.POSTGRES_USER}`);
    console.log(`SSL: ${process.env.POSTGRES_SSL === 'true' ? 'enabled' : 'disabled'}`);

    connection = postgres({
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    // Initialize Drizzle
    db = drizzle(connection, { schema });

    // Run migrations
    const migrationsPath = path.join(__dirname, 'migrations');
    try {
      console.log('Running database migrations...');
      await migrate(db, { migrationsFolder: migrationsPath });
      console.log('Migrations applied successfully');
    } catch (migrateError) {
      // Check if it's because migrations folder doesn't exist or is empty
      const fs = await import('fs');
      if (!fs.existsSync(migrationsPath)) {
        console.warn('Migrations folder does not exist. Run `npm run db:generate` to create migrations.');
      } else {
        const migrationFiles = fs.readdirSync(migrationsPath).filter(file =>
          file.endsWith('.sql') || fs.statSync(path.join(migrationsPath, file)).isDirectory()
        );
        if (migrationFiles.length === 0) {
          console.warn('Migrations folder exists but is empty. Run `npm run db:generate` to create migrations.');
        } else {
          console.error('Migration error:', migrateError);
          throw migrateError;
        }
      }
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

export const closeDatabase = async () => {
  if (connection) {
    await connection.end();
    connection = null;
    db = null;
  }
};

export { schema };
