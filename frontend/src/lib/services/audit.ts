import { db } from "../db";
import { auditLog } from "../db/schema";

export const AuditActions = {
  SIGN_IN: "auth.sign_in",
  SIGN_OUT: "auth.sign_out",
  SIGN_UP_VERIFIED: "auth.sign_up_verified",
  SHARING_CHANGED: "tree.sharing_changed",
  LIVING_REDACTION_CHANGED: "tree.living_redaction_changed",
  SHARE_TOKEN_ISSUED: "tree.share_token_issued",
  SHARE_TOKEN_REVOKED: "tree.share_token_revoked",
  VISIBILITY_CHANGED: "person.visibility_changed",
  PERSON_DELETED: "person.deleted",
  DATA_EXPORTED: "rights.data_exported",
  NODE_ERASED: "rights.node_erased",
  ACCOUNT_DELETED: "rights.account_deleted",
  FEEDBACK_SUBMITTED: "feedback.submitted",
  FEEDBACK_STATUS_CHANGED: "feedback.status_changed",
};

export class AuditService {
  async record(
    actorUserId: string | null,
    action: string,
    targetType?: string | null,
    targetId?: string | null,
    detail?: string | null
  ): Promise<void> {
    await db.insert(auditLog).values({
      actorUserId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      detail: detail || null,
    });
  }
}

export const auditService = new AuditService();
