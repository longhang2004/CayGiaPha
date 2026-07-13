"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteReminder,
  getReminders,
  markReminderAsRead,
  type InAppReminder,
} from "@/lib/persons";
import { getPendingInvitations } from "@/lib/collaboration";
import { useSession } from "@/app/providers";
import { CGPPopover } from "@/components/cgp";
import { BellIcon, TrashIcon } from "@/components/ui/Icons";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

export type ExtendedNotification = Partial<InAppReminder> & {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  isInvite?: boolean;
  treeId?: string;
};

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const { user } = useSession();
  const router = useRouter();
  const [reminders, setReminders] = useState<ExtendedNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReminders();
      let extended: ExtendedNotification[] = [...data];

      if (user) {
        try {
          const treeList = await api.get<Array<{ id: string; accessRole: string }>>("/trees");
          const ownerTreeIds = treeList.filter((tree) => tree.accessRole === "OWNER").map((tree) => tree.id);
          const pendingGroups = await Promise.all(
            ownerTreeIds.map(async (treeId) => ({
              treeId,
              invitations: await getPendingInvitations(treeId),
            })),
          );
          const inviteNotifications: ExtendedNotification[] = pendingGroups.flatMap(
            ({ treeId, invitations }) => invitations.map((inv) => ({
              id: `invite-${inv.id}`,
              title: "Yêu cầu tham gia cây",
              content: `${inv.email || "Một người dùng"} đang xin vào cây gia phả của bạn.`,
              isRead: false,
              isInvite: true,
              treeId,
            })),
          );
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
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReminders();
      const interval = setInterval(fetchReminders, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchReminders, user]);

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
    if (reminder.isInvite && reminder.treeId) {
      setIsOpen(false);
      router.push(`/tree/${encodeURIComponent(reminder.treeId)}?collaboration=true`);
    }
  };

  return (
    <CGPPopover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <>
          <BellIcon size={20} />
          {unreadCount > 0 && (
            <span className="notification-bell__badge">{unreadCount}</span>
          )}
        </>
      }
      triggerAriaLabel={
        unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"
      }
      triggerClassName="notification-bell__trigger"
      ariaLabel="Thông báo dòng họ"
      placement={align === "right" ? "bottom end" : "bottom start"}
      size="md"
      className="notification-bell__popover"
    >
      <div className="notification-bell__content">
        <div className="notification-bell__header">
          <span className="notification-bell__title">Thông báo dòng họ</span>
          {unreadCount > 0 && (
            <span className="notification-bell__unread-summary">
              {unreadCount} chưa đọc
            </span>
          )}
        </div>

        <div className="notification-bell__list">
          {loading && reminders.length === 0 ? (
            <p className="notification-bell__status">Đang tải…</p>
          ) : reminders.length === 0 ? (
            <p className="notification-bell__status">Không có thông báo nào.</p>
          ) : (
            reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`notification-bell__item${
                  reminder.isRead ? "" : " notification-bell__item--unread"
                }`}
              >
                <div className="notification-bell__item-header">
                  <span className="notification-bell__item-title">
                    {reminder.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(reminder.id, e)}
                    className="notification-bell__delete"
                    aria-label="Xóa thông báo"
                    title="Xóa thông báo"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
                <p className="notification-bell__message">
                  {reminder.content}
                </p>

                {!reminder.isRead && !reminder.isInvite && (
                  <button
                    type="button"
                    onClick={(e) => handleMarkAsRead(reminder.id, e)}
                    className="notification-bell__action"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
                {reminder.isInvite && (
                  <button
                    type="button"
                    onClick={(e) => handleAction(reminder, e)}
                    className="notification-bell__action notification-bell__action--invite"
                  >
                    Mở quản lý cộng tác
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </CGPPopover>
  );
}
