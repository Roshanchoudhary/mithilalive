import { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = DrizzleD1Database<typeof schema>;

export function createDb(db: D1Database): Database {
  return drizzle(db, { schema });
}

export const tables = schema;
