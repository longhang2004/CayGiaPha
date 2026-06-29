import { drizzle as nodeDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "";
const isNeon = databaseUrl.includes("neon.tech") || databaseUrl.includes("neon.development");

let dbInstance;

if (isNeon) {
  const pool = new NeonPool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
  });
  dbInstance = neonDrizzle(pool, { schema });
} else {
  const pool = new PgPool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  });
  dbInstance = nodeDrizzle(pool, { schema });
}

// Run migration check in the background to self-heal schema discrepancies (like missing V14/V15 columns on production)
if (databaseUrl) {
  Promise.resolve().then(async () => {
    try {
      console.log("[drizzle] Auto-applying schema migrations...");
      await dbInstance.execute(sql`ALTER TABLE person_photos ADD COLUMN IF NOT EXISTS photo_year INTEGER;`);
      await dbInstance.execute(sql`ALTER TABLE person_photos ADD COLUMN IF NOT EXISTS description TEXT;`);
      await dbInstance.execute(sql`
        CREATE TABLE IF NOT EXISTS tree_collaborators (
            id UUID NOT NULL,
            tree_id UUID NOT NULL,
            user_id UUID NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'contributor',
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_tree_collaborators PRIMARY KEY (id),
            CONSTRAINT fk_tree_collaborators_tree FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
            CONSTRAINT fk_tree_collaborators_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT uq_tree_collaborators_tree_user UNIQUE (tree_id, user_id)
        );
      `);
      await dbInstance.execute(sql`
        CREATE TABLE IF NOT EXISTS collaboration_invitations (
            id UUID NOT NULL,
            tree_id UUID NOT NULL,
            inviter_user_id UUID NOT NULL,
            email VARCHAR(255) NOT NULL,
            code VARCHAR(6) NOT NULL,
            status VARCHAR(25) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            CONSTRAINT pk_collaboration_invitations PRIMARY KEY (id),
            CONSTRAINT fk_collaboration_invitations_tree FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
            CONSTRAINT fk_collaboration_invitations_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
      console.log("[drizzle] Schema migrations verified and applied.");
    } catch (err) {
      console.warn("[drizzle] Schema migration check completed with warning (usually safe if already applied):", err);
    }
  });
}

export const db = dbInstance;
