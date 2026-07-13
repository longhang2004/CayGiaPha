import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  claims,
  collaborationInvitations,
  inAppReminders,
  personPhotos,
  persons,
  relationships,
  treeCollaborators,
  trees,
  users,
} from "../db/schema";
import { escapeHtml, sendEmail } from "./email";
import { ApiException } from "./errors";
import { deleteStoredPhotoObjects } from "./photo";

export class TreeDeletionService {
  async delete(treeId: string): Promise<void> {
    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);
    if (!tree) {
      throw ApiException.validation("treeId", "Cây gia phả không tồn tại.");
    }

    const contributors = await db
      .select({ email: users.email })
      .from(treeCollaborators)
      .innerJoin(users, eq(treeCollaborators.userId, users.id))
      .where(eq(treeCollaborators.treeId, treeId));
    const pendingInvites = await db
      .select({ email: collaborationInvitations.email })
      .from(collaborationInvitations)
      .where(and(
        eq(collaborationInvitations.treeId, treeId),
        eq(collaborationInvitations.status, "pending"),
      ));
    const emails = new Set<string>();
    for (const row of [...contributors, ...pendingInvites]) {
      if (row.email) emails.add(row.email);
    }

    const personRows = await db
      .select({ id: persons.id })
      .from(persons)
      .where(eq(persons.treeId, treeId));
    const personIds = personRows.map((person) => person.id);
    const photoRows = personIds.length > 0
      ? await db
          .select({ objectKey: personPhotos.objectKey })
          .from(personPhotos)
          .where(inArray(personPhotos.personId, personIds))
      : [];

    await db.transaction(async (tx) => {
      if (personIds.length > 0) {
        await tx.delete(personPhotos).where(inArray(personPhotos.personId, personIds));
        await tx.delete(claims).where(inArray(claims.personId, personIds));
        await tx.delete(inAppReminders).where(inArray(inAppReminders.personId, personIds));
      }
      await tx.delete(relationships).where(eq(relationships.treeId, treeId));
      await tx.delete(persons).where(eq(persons.treeId, treeId));
      await tx.delete(treeCollaborators).where(eq(treeCollaborators.treeId, treeId));
      await tx.delete(collaborationInvitations).where(eq(collaborationInvitations.treeId, treeId));
      await tx.delete(trees).where(eq(trees.id, treeId));
    });

    await deleteStoredPhotoObjects(
      photoRows.map((photo) => photo.objectKey),
      "tree-delete",
    );

    const safeTreeName = escapeHtml(tree.name);
    let failedNotifications = 0;
    for (const email of emails) {
      try {
        await sendEmail({
          to: email,
          subject: `Thông báo: Cây gia phả "${tree.name}" đã bị xóa`,
          text: `Chào bạn, chúng tôi xin thông báo cây gia phả "${tree.name}" mà bạn đang cộng tác tham gia đã bị xóa bởi chủ sở hữu.`,
          html: `<p>Chào bạn,</p><p>Chúng tôi xin thông báo cây gia phả <strong>"${safeTreeName}"</strong> mà bạn đang cộng tác tham gia đã bị xóa bởi chủ sở hữu.</p>`,
        });
      } catch {
        failedNotifications += 1;
      }
    }
    if (failedNotifications > 0) {
      console.error("[tree-delete] Some contributor notifications failed.", {
        failedNotifications,
      });
    }
  }
}

export const treeDeletionService = new TreeDeletionService();
