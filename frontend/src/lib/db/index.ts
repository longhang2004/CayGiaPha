import { drizzle as nodeDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "";
const isNeon = databaseUrl.includes("neon.tech") || databaseUrl.includes("neon.development");
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

type NodeDb = ReturnType<typeof nodeDrizzle<typeof schema>>;
type NeonDb = ReturnType<typeof neonDrizzle<typeof schema>>;

let dbInstance: NodeDb | NeonDb;

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

async function ensureAdminAccount() {
  const adminEmail =
    process.env.ADMIN_EMAIL ||
    (process.env.NODE_ENV === "production" ? "" : "admin@caygiapha.local");
  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "production" ? "" : "Admin@123456");

  if (!adminEmail || !adminPassword) {
    return;
  }

  const bcrypt = require("bcryptjs");
  const passwordHash = bcrypt.hashSync(adminPassword, bcrypt.genSaltSync(10));
  const existing = await dbInstance
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .then((rows) => rows[0]);

  if (existing) {
    // Never silently reset passwords or re-elevate accounts on every boot.
    // Only ensure role=admin when ADMIN_FORCE_RESET=true (explicit ops action).
    if (process.env.ADMIN_FORCE_RESET === "true") {
      await dbInstance
        .update(schema.users)
        .set({ role: "admin", verified: true, passwordHash })
        .where(eq(schema.users.id, existing.id));
    }
    return;
  }

  await dbInstance.insert(schema.users).values({
    phone: null,
    email: adminEmail,
    passwordHash,
    role: "admin",
    verified: true,
  });
}

// Run migration check in the background to self-heal schema discrepancies (like missing V14/V15 columns on production)
if (databaseUrl && !isProductionBuild) {
  Promise.resolve().then(async () => {
    try {
      console.log("[drizzle] Auto-applying schema migrations...");
      try {
        await dbInstance.execute(sql`ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_key;`);
      } catch (e) {}
      try {
        await dbInstance.execute(sql`ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_unique;`);
      } catch (e) {}
      try {
        await dbInstance.execute(sql`ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_uq;`);
      } catch (e) {}
      try {
        await dbInstance.execute(sql`DROP INDEX IF EXISTS trees_owner_user_id_key;`);
      } catch (e) {}
      try {
        await dbInstance.execute(sql`DROP INDEX IF EXISTS trees_owner_user_id_unique_idx;`);
      } catch (e) {}
      try {
        await dbInstance.execute(sql`ALTER TABLE trees ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Cây Gia Phả';`);
      } catch (e) {}
      await dbInstance.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';`);
      await dbInstance.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;`);
      await dbInstance.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_display_name_normalized'
          ) THEN
            ALTER TABLE users
              ADD CONSTRAINT ck_users_display_name_normalized
              CHECK (
                display_name IS NULL
                OR (
                  char_length(display_name) BETWEEN 1 AND 100
                  AND display_name !~ '[[:cntrl:]]'
                  AND display_name = regexp_replace(btrim(display_name), '[[:space:]]+', ' ', 'g')
                )
              );
          END IF;
        END $$;
      `);
      await dbInstance.execute(sql`
        CREATE TABLE IF NOT EXISTS feedback_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          email TEXT NOT NULL,
          category TEXT NOT NULL,
          message TEXT NOT NULL,
          attachment_keys TEXT,
          status TEXT NOT NULL DEFAULT 'new',
          admin_note TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await dbInstance.execute(sql`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS attachment_keys TEXT;`);
      await dbInstance.execute(sql`CREATE INDEX IF NOT EXISTS ix_feedback_messages_status ON feedback_messages(status);`);
      await dbInstance.execute(sql`CREATE INDEX IF NOT EXISTS ix_feedback_messages_created_at ON feedback_messages(created_at);`);
      await dbInstance.execute(sql`CREATE INDEX IF NOT EXISTS ix_feedback_messages_user ON feedback_messages(user_id);`);
      await ensureAdminAccount();
      await dbInstance.execute(sql`ALTER TABLE person_photos ADD COLUMN IF NOT EXISTS photo_year INTEGER;`);
      await dbInstance.execute(sql`ALTER TABLE person_photos ADD COLUMN IF NOT EXISTS description TEXT;`);
      // V20/V21: high-entropy invite codes + hashed session tokens
      await dbInstance.execute(sql`ALTER TABLE collaboration_invitations ALTER COLUMN code TYPE VARCHAR(64);`);
      await dbInstance.execute(sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash TEXT;`);
      await dbInstance.execute(sql`
        UPDATE sessions
        SET token_hash = md5(id::text) || md5(id::text || 'session')
        WHERE token_hash IS NULL;
      `);
      await dbInstance.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_token_hash ON sessions (token_hash);
      `);
      await dbInstance.execute(sql`
        CREATE TABLE IF NOT EXISTS tree_collaborators (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
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
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tree_id UUID NOT NULL,
            inviter_user_id UUID NOT NULL,
            email VARCHAR(255),
            code VARCHAR(64) NOT NULL,
            status VARCHAR(25) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            CONSTRAINT pk_collaboration_invitations PRIMARY KEY (id),
            CONSTRAINT fk_collaboration_invitations_tree FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
            CONSTRAINT fk_collaboration_invitations_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
      // Repair older schemas created without UUID defaults (join insert used DEFAULT).
      await dbInstance.execute(sql`
        ALTER TABLE tree_collaborators ALTER COLUMN id SET DEFAULT gen_random_uuid();
      `);
      await dbInstance.execute(sql`
        ALTER TABLE collaboration_invitations ALTER COLUMN id SET DEFAULT gen_random_uuid();
      `);
      console.log("[drizzle] Schema migrations verified and applied.");
    } catch (err) {
      console.warn("[drizzle] Schema migration check completed with warning (usually safe if already applied):", err);
    }
  });
}

export const db = dbInstance;
