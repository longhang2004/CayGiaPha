import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  uniqueIndex,
  index,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";

// ==========================================
// USERS
// ==========================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone"),
    email: text("email"),
    displayName: text("display_name"),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("user"),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    phoneUniqueIdx: uniqueIndex("ux_users_phone").on(table.phone),
    emailUniqueIdx: uniqueIndex("ux_users_email").on(table.email),
  })
);

// ==========================================
// FEEDBACK MESSAGES
// ==========================================
export const feedbackMessages = pgTable(
  "feedback_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    category: text("category").notNull(),
    message: text("message").notNull(),
    attachmentKeys: text("attachment_keys"),
    status: text("status").notNull().default("new"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("ix_feedback_messages_status").on(table.status),
    createdAtIdx: index("ix_feedback_messages_created_at").on(table.createdAt),
    userIdIdx: index("ix_feedback_messages_user").on(table.userId),
  })
);

// ==========================================
// SESSIONS
// ==========================================
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** SHA-256 hex of the opaque cookie token; never the raw token. */
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked: boolean("revoked").notNull().default(false),
  },
  (table) => ({
    userIdIdx: index("ix_sessions_user_id").on(table.userId),
    tokenHashUniqueIdx: uniqueIndex("ux_sessions_token_hash").on(table.tokenHash),
  })
);

// ==========================================
// TREES
// ==========================================
export const trees = pgTable("trees", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull().default("Cây Gia Phả"),
  region: text("region").notNull().default("Bac"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sharing: text("sharing").notNull().default("private"),
  livingRedaction: boolean("living_redaction").notNull().default(true),
});

// ==========================================
// PERSONS
// ==========================================
export const persons = pgTable(
  "persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id),
    displayName: text("display_name").notNull(),
    gender: text("gender").notNull(), // 'male' | 'female'
    birthOrder: integer("birth_order"),
    birthYear: integer("birth_year"),
    phone: text("phone"),
    email: text("email"),
    deathStatus: boolean("death_status").notNull().default(false),
    deathDay: integer("death_day"),
    deathMonth: integer("death_month"),
    deathYear: integer("death_year"),
    deathCalendar: text("death_calendar").default("lunar"),
    deathLunarLeap: boolean("death_lunar_leap").default(false),
    adoptionStatus: boolean("adoption_status"),
    visMarital: text("vis_marital").notNull().default("private"),
    visAdoption: text("vis_adoption").notNull().default("private"),
    visDeath: text("vis_death").notNull().default("private"),
    visName: text("vis_name").notNull().default("public"),
    visBirthYear: text("vis_birth_year").notNull().default("public"),
    visPhoto: text("vis_photo").notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    treeIdIdx: index("ix_persons_tree_id").on(table.treeId),
  })
);

// ==========================================
// RELATIONSHIPS
// ==========================================
export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id),
    type: text("type").notNull(), // 'bloodline_father', 'bloodline_mother', 'marriage', 'non_bloodline', 'asserted'
    sourceId: uuid("source_id")
      .notNull()
      .references(() => persons.id),
    targetId: uuid("target_id")
      .notNull()
      .references(() => persons.id),
    maritalStatus: text("marital_status"), // 'married', 'divorced', 'deceased'
    socialType: text("social_type"), // 'friend', 'teacher', 'colleague'
    assertedLabel: text("asserted_label"),
    derivationState: text("derivation_state").notNull().default("derived"), // 'derived', 'asserted', 'verified', 'conflict'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    treeTypeIdx: index("ix_relationships_tree_type").on(table.treeId, table.type),
    sourceIdx: index("ix_relationships_source").on(table.sourceId),
    targetIdx: index("ix_relationships_target").on(table.targetId),
    oneFatherUniqueIdx: uniqueIndex("ux_relationships_one_father")
      .on(table.targetId)
      .where(sql`type = 'bloodline_father'`),
    oneMotherUniqueIdx: uniqueIndex("ux_relationships_one_mother")
      .on(table.targetId)
      .where(sql`type = 'bloodline_mother'`),
  })
);

// ==========================================
// CLAIMS
// ==========================================
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .unique()
      .references(() => persons.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ix_claims_user_id").on(table.userId),
  })
);

// ==========================================
// VERIFICATION CODES
// ==========================================
export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purpose: text("purpose").notNull(), // 'signup', 'signin', 'claim'
    userId: uuid("user_id").references(() => users.id),
    personId: uuid("person_id").references(() => persons.id),
    destination: text("destination").notNull(),
    codeHash: text("code_hash").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumed: boolean("consumed").notNull().default(false),
  },
  (table) => ({
    userIdIdx: index("ix_verification_codes_user_id").on(table.userId),
    personIdIdx: index("ix_verification_codes_person_id").on(table.personId),
  })
);

// ==========================================
// REGION KINSHIP TERMS
// ==========================================
export const regionKinshipTerms = pgTable(
  "region_kinship_terms",
  {
    region: text("region").notNull(), // 'Bac', 'Trung', 'Nam'
    canonicalRelation: text("canonical_relation").notNull(),
    term: text("term").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.region, table.canonicalRelation] }),
  })
);

// ==========================================
// TREE SHARE TOKENS
// ==========================================
export const treeShareTokens = pgTable(
  "tree_share_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    hashUniqueIdx: uniqueIndex("ux_tree_share_tokens_hash").on(table.tokenHash),
    treeIdIdx: index("ix_tree_share_tokens_tree").on(table.treeId),
  })
);

// ==========================================
// LEGAL DOCUMENTS
// ==========================================
export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docType: text("doc_type").notNull(), // 'tos', 'privacy'
    version: integer("version").notNull(),
    body: text("body").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeVersionUniqueIdx: uniqueIndex("uq_legal_documents_type_version").on(
      table.docType,
      table.version
    ),
  })
);

// ==========================================
// USER CONSENTS
// ==========================================
export const userConsents = pgTable(
  "user_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    docType: text("doc_type").notNull(), // 'tos', 'privacy'
    version: integer("version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ix_user_consents_user").on(table.userId),
  })
);

// ==========================================
// AUDIT LOG
// ==========================================
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorIdx: index("ix_audit_log_actor").on(table.actorUserId),
    createdAtIdx: index("ix_audit_log_created_at").on(table.createdAt),
  })
);

// ==========================================
// PERSON PHOTOS
// ==========================================
export const personPhotos = pgTable(
  "person_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull().unique(),
    contentType: text("content_type").notNull(), // 'image/jpeg' | 'image/png'
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    isPrimary: boolean("is_primary").notNull().default(false),
    photoYear: integer("photo_year"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    personIdx: index("ix_person_photos_person").on(table.personId),
    onePrimaryUniqueIdx: uniqueIndex("ux_person_photos_one_primary")
      .on(table.personId)
      .where(sql`is_primary = true`),
  })
);

// ==========================================
// IN-APP REMINDERS
// ==========================================
export const inAppReminders = pgTable(
  "in_app_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    title: text("title").notNull(),
    content: text("content").notNull(),
    daysUntil: integer("days_until").notNull(),
    anniversaryDate: timestamp("anniversary_date", { withTimezone: false }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ix_in_app_reminders_user").on(table.userId),
    uniqueReminderIdx: uniqueIndex("ux_in_app_reminders_unique").on(
      table.userId,
      table.personId,
      table.anniversaryDate,
      table.daysUntil
    ),
  })
);

// ==========================================
// TREE COLLABORATORS
// ==========================================
export const treeCollaborators = pgTable(
  "tree_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("contributor"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    treeUserUniqueIdx: uniqueIndex("uq_tree_collaborators_tree_user").on(table.treeId, table.userId),
  })
);

// ==========================================
// COLLABORATION INVITATIONS
// ==========================================
export const collaborationInvitations = pgTable(
  "collaboration_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id")
      .notNull()
      .references(() => trees.id, { onDelete: "cascade" }),
    inviterUserId: uuid("inviter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email"),
    requesterUserId: uuid("requester_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourceInvitationId: uuid("source_invitation_id").references(
      (): AnyPgColumn => collaborationInvitations.id,
      { onDelete: "cascade" },
    ),
    code: text("code").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    sourceRequesterUniqueIdx: uniqueIndex("ux_collaboration_source_requester")
      .on(table.sourceInvitationId, table.requesterUserId)
      .where(sql`${table.sourceInvitationId} IS NOT NULL AND ${table.requesterUserId} IS NOT NULL`),
  }),
);
