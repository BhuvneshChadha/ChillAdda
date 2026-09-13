import { neon } from "@neondatabase/serverless";

let initialized = false;
let initializationPromise;

const databaseUrl = process.env.DATABASE_URL;

export const sql = databaseUrl ? neon(databaseUrl) : null;

export async function dbConnect() {
  if (!sql) {
    throw new Error("DATABASE_URL must be set for the Neon database");
  }
  if (initialized) return;
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS user_data (
          id UUID PRIMARY KEY,
          favourites JSONB NOT NULL DEFAULT '[]'::jsonb,
          song_history JSONB NOT NULL DEFAULT '[]'::jsonb,
          languages JSONB NOT NULL DEFAULT '[]'::jsonb,
          playlists JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          user_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT,
          image_url TEXT NOT NULL,
          reset_password_token TEXT,
          reset_password_expires TIMESTAMPTZ,
          is_verified BOOLEAN NOT NULL DEFAULT FALSE,
          verification_token TEXT,
          verification_token_expires TIMESTAMPTZ,
          user_data_id UUID REFERENCES user_data(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS playlists (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          songs JSONB NOT NULL DEFAULT '[]'::jsonb,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      initialized = true;
    })().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }
  await initializationPromise;
}

export default dbConnect;
