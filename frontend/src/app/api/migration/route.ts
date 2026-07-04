import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("Starting inline DB migrations...");
    
    // Add columns to person_photos
    await db.execute(sql`ALTER TABLE person_photos ADD COLUMN IF NOT EXISTS photo_year INTEGER;`);
    await db.execute(sql`ALTER TABLE person_photos ADD COLUMN IF NOT EXISTS description TEXT;`);
    console.log("V14 applied.");

    // Create tree_collaborators
    await db.execute(sql`
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
    console.log("tree_collaborators table created/verified.");

    // Create collaboration_invitations
    await db.execute(sql`
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
    console.log("collaboration_invitations table created/verified.");

    // V16: Allow multiple trees and tree name
    try {
      await db.execute(sql`ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_key;`);
    } catch (e) {}
    try {
      await db.execute(sql`ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_unique;`);
    } catch (e) {}
    try {
      await db.execute(sql`ALTER TABLE trees DROP CONSTRAINT IF EXISTS trees_owner_user_id_uq;`);
    } catch (e) {}
    try {
      await db.execute(sql`DROP INDEX IF EXISTS trees_owner_user_id_key;`);
    } catch (e) {}
    try {
      await db.execute(sql`DROP INDEX IF EXISTS trees_owner_user_id_unique_idx;`);
    } catch (e) {}
    try {
      await db.execute(sql`ALTER TABLE trees ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Cây Gia Phả';`);
    } catch (e) {}
    console.log("V16 applied.");

    // V17: Admin role + feedback inbox
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feedback_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        admin_note TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ix_feedback_messages_status ON feedback_messages(status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ix_feedback_messages_created_at ON feedback_messages(created_at);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ix_feedback_messages_user ON feedback_messages(user_id);`);
    console.log("V17 applied.");

    return NextResponse.json({ success: true, message: "Migrations executed successfully." });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
