import { drizzle as nodeDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "";
const isNeon = databaseUrl.includes("neon.tech") || databaseUrl.includes("neon.development");

let dbInstance;

if (isNeon) {
  const pool = new NeonPool({
    connectionString: databaseUrl,
  });
  dbInstance = neonDrizzle(pool, { schema });
} else {
  const pool = new PgPool({
    connectionString: databaseUrl,
  });
  dbInstance = nodeDrizzle(pool, { schema });
}

export const db = dbInstance;
