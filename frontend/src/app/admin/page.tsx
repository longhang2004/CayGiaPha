import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  feedbackMessages,
  persons,
  relationships,
  trees,
  users,
} from "@/lib/db/schema";
import { getAuthContext } from "@/lib/services/authorization";
import { AdminFeedbackActions } from "@/components/admin/AdminFeedbackActions";

export const dynamic = "force-dynamic";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10) || 0;
  return 0;
}

async function tableCount(table: any) {
  const row = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(table)
    .then((rows) => rows[0]);
  return toNumber(row?.value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function categoryLabel(category: string) {
  if (category === "bug") return "Lỗi";
  if (category === "feature") return "Tính năng";
  return "Khác";
}

function statusLabel(status: string) {
  if (status === "reviewed") return "Đã xem";
  if (status === "resolved") return "Đã xử lý";
  return "Mới";
}

function parseFeedbackAttachments(value: string | null): Array<{ originalName?: string }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) {
    redirect("/signin");
  }

  if (auth.role !== "admin") {
    return (
      <section className="center-state">
        <div className="center-state__card">
          <h1>Không có quyền truy cập</h1>
          <p>Trang này chỉ dành cho tài khoản admin.</p>
        </div>
      </section>
    );
  }

  const [
    userCount,
    treeCount,
    personCount,
    relationshipCount,
    feedbackCount,
    newFeedbackRow,
    recentFeedback,
    recentUsers,
  ] = await Promise.all([
    tableCount(users),
    tableCount(trees),
    tableCount(persons),
    tableCount(relationships),
    tableCount(feedbackMessages),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(feedbackMessages)
      .where(eq(feedbackMessages.status, "new"))
      .then((rows) => rows[0]),
    db
      .select({
        id: feedbackMessages.id,
        email: feedbackMessages.email,
        category: feedbackMessages.category,
        message: feedbackMessages.message,
        attachmentKeys: feedbackMessages.attachmentKeys,
        status: feedbackMessages.status,
        createdAt: feedbackMessages.createdAt,
      })
      .from(feedbackMessages)
      .orderBy(desc(feedbackMessages.createdAt))
      .limit(8),
    db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(6),
  ]);

  const newFeedbackCount = toNumber(newFeedbackRow?.value);

  return (
    <section className="admin-dashboard" aria-labelledby="admin-title">
      <div className="admin-dashboard__header">
        <div>
          <h1 id="admin-title">Admin Dashboard</h1>
          <p>
            Theo dõi sức khỏe sản phẩm, lượng dữ liệu gia phả và feedback người
            dùng để ưu tiên cải thiện trong giai đoạn trải nghiệm miễn phí.
          </p>
        </div>
        <span className="admin-dashboard__badge">Admin</span>
      </div>

      <div className="admin-dashboard__metrics" aria-label="Thống kê tổng quan">
        <article className="admin-metric">
          <span>Người dùng</span>
          <strong>{userCount}</strong>
        </article>
        <article className="admin-metric">
          <span>Cây gia phả</span>
          <strong>{treeCount}</strong>
        </article>
        <article className="admin-metric">
          <span>Thành viên</span>
          <strong>{personCount}</strong>
        </article>
        <article className="admin-metric">
          <span>Quan hệ</span>
          <strong>{relationshipCount}</strong>
        </article>
        <article className="admin-metric">
          <span>Feedback</span>
          <strong>{feedbackCount}</strong>
        </article>
        <article className="admin-metric">
          <span>Feedback mới</span>
          <strong>{newFeedbackCount}</strong>
        </article>
      </div>

      <div className="admin-dashboard__grid">
        <section className="admin-panel" aria-labelledby="feedback-inbox-title">
          <div className="admin-panel__header">
            <h2 id="feedback-inbox-title">Hộp thư feedback</h2>
          </div>
          <div className="admin-panel__body">
            {recentFeedback.length === 0 ? (
              <p style={{ color: "var(--color-muted)" }}>Chưa có feedback nào.</p>
            ) : (
              <div className="admin-feedback-list">
                {recentFeedback.map((feedback) => (
                  <article key={feedback.id} className="admin-feedback-item">
                    <div className="admin-feedback-item__meta">
                      <strong>{feedback.email}</strong>
                      <span>{categoryLabel(feedback.category)}</span>
                      <span className="admin-status">{statusLabel(feedback.status)}</span>
                      <span>{formatDate(feedback.createdAt)}</span>
                    </div>
                    <p className="admin-feedback-item__message">{feedback.message}</p>
                    {parseFeedbackAttachments(feedback.attachmentKeys).length > 0 ? (
                      <div className="admin-feedback-item__attachments" aria-label="Ảnh feedback đính kèm">
                        {parseFeedbackAttachments(feedback.attachmentKeys).map((attachment, index) => (
                          <a
                            key={`${feedback.id}-${index}`}
                            href={`/api/v1/admin/feedback/${feedback.id}/attachments/${index}`}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-feedback-attachment"
                          >
                            <img
                              src={`/api/v1/admin/feedback/${feedback.id}/attachments/${index}`}
                              alt={attachment.originalName || `Ảnh feedback ${index + 1}`}
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <AdminFeedbackActions
                      feedbackId={feedback.id}
                      currentStatus={feedback.status}
                    />
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="admin-panel" aria-labelledby="recent-users-title">
          <div className="admin-panel__header">
            <h2 id="recent-users-title">Người dùng mới</h2>
          </div>
          <div className="admin-panel__body">
            <div className="admin-list">
              {recentUsers.map((user) => (
                <div className="admin-list__item" key={user.id}>
                  <div>
                    <strong>{user.email || user.phone || "Chưa có định danh"}</strong>
                    <br />
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  <span className="admin-status">{user.role === "admin" ? "Admin" : "User"}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
