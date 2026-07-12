"use client";

import { useEffect, useState, useRef } from "react";
import { getReminders, markReminderAsRead, deleteReminder, type InAppReminder } from "@/lib/persons";
import { getPendingInvitations, type CollaborationInvitation } from "@/lib/collaboration";
import { useSession } from "@/app/providers";
import { BellIcon, TrashIcon } from "@/components/ui/Icons";
import { useRouter } from "next/navigation";

export type ExtendedNotification = Partial<InAppReminder> & {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  isInvite?: boolean;
};

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const { user } = useSession();
  const router = useRouter();
  const [reminders, setReminders] = useState<ExtendedNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const data = await getReminders();
      let extended: ExtendedNotification[] = [...data];

      if (user?.treeId) {
        try {
          const pending = await getPendingInvitations(user.treeId);
          const inviteNotifications: ExtendedNotification[] = pending.map((inv) => ({
            id: `invite-${inv.id}`,
            title: "Yêu cầu tham gia cây",
            content: `${inv.email || "Một người dùng"} đang xin vào cây gia phả của bạn.`,
            isRead: false,
            isInvite: true,
          }));
          extended = [...inviteNotifications, ...extended];
        } catch (e) {
          // ignore 403 if not owner
        }
      }
      setReminders(extended);
    } catch (err) {
      console.error("Failed to load reminders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReminders();
      const interval = setInterval(fetchReminders, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = reminders.filter((r) => !r.isRead).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!id.startsWith("invite-")) {
        await markReminderAsRead(id);
      }
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isRead: true } : r))
      );
    } catch (err) {
      console.error("Failed to mark reminder as read:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!id.startsWith("invite-")) {
        await deleteReminder(id);
      }
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  const handleAction = (reminder: ExtendedNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (reminder.isInvite) {
      setIsOpen(false);
      router.push("/tree?panel=settings");
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "1.25rem",
          position: "relative",
          padding: "0.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-muted)",
          transition: "color 0.2s"
        }}
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              background: "var(--color-danger, #ef4444)",
              color: "#fff",
              borderRadius: "50%",
              minWidth: "16px",
              height: "16px",
              fontSize: "0.6875rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 0 2px var(--color-background)"
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: align === "right" ? 0 : "auto",
            left: align === "left" ? 0 : "auto",
            marginTop: "0.5rem",
            width: "320px",
            background: "var(--color-surface-card)",
            color: "var(--color-fg)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--color-hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ fontWeight: "600", fontSize: "0.875rem" }}>Thông báo dòng họ</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                {unreadCount} chưa đọc
              </span>
            )}
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {loading && reminders.length === 0 ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "var(--color-muted)", margin: 0, fontSize: "0.875rem" }}>
                Đang tải…
              </p>
            ) : reminders.length === 0 ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "var(--color-muted)", margin: 0, fontSize: "0.875rem" }}>
                Không có thông báo nào.
              </p>
            ) : (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--color-hairline)",
                    background: reminder.isRead ? "transparent" : "var(--color-surface-strong)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    position: "relative",
                    transition: "background-color 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{
                      fontWeight: reminder.isRead ? "500" : "600",
                      fontSize: "0.875rem",
                      color: reminder.isRead ? "var(--color-muted)" : "inherit"
                    }}>
                      {reminder.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(reminder.id, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        color: "var(--color-muted)",
                        padding: "0.125rem",
                        display: "flex",
                        alignItems: "center"
                      }}
                      title="Xóa thông báo"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: "0.8125rem",
                    color: "var(--color-muted)",
                    lineHeight: "1.3"
                  }}>
                    {reminder.content}
                  </p>
                  
                  {!reminder.isRead && !reminder.isInvite && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(reminder.id, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-accent)",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        padding: 0,
                        cursor: "pointer",
                        marginTop: "0.25rem",
                        alignSelf: "flex-start"
                      }}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                  {reminder.isInvite && (
                    <button
                      type="button"
                      onClick={(e) => handleAction(reminder, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-brand)",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        padding: 0,
                        cursor: "pointer",
                        marginTop: "0.25rem",
                        alignSelf: "flex-start"
                      }}
                    >
                      Mở quản lý cộng tác
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
