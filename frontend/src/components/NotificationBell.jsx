import React, { useEffect, useRef, useState } from "react";
import {
  getDonorNotifications,
  getHospitalNotifications,
  getReceiverNotifications,
  markAllNotificationsRead,
} from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

const FETCHERS = {
  donor: getDonorNotifications,
  hospital: getHospitalNotifications,
  receiver: getReceiverNotifications,
};

function timeAgo(isoString, t) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return t("just now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("{n}m ago", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("{n}h ago", { n: hours });
  const days = Math.floor(hours / 24);
  return t("{n}d ago", { n: days });
}

// Remember which notifications already popped up, so each one is shown only once (even after a reload).
const SEEN_KEY = "lifeflow_seen_notifs";
function loadSeen(role) {
  try { return new Set(JSON.parse(localStorage.getItem(`${SEEN_KEY}_${role}`) || "[]")); } catch (e) { return new Set(); }
}
function saveSeen(role, set) {
  try { localStorage.setItem(`${SEEN_KEY}_${role}`, JSON.stringify([...set].slice(-300))); } catch (e) { /* ignore */ }
}

export default function NotificationBell({ role }) {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const panelRef = useRef(null);
  const seenIds = useRef(new Set());
  const firstLoad = useRef(true);

  async function load() {
    const fetcher = FETCHERS[role];
    if (!fetcher) return;
    try {
      const response = await fetcher();
      const fresh = response.data;

      if (firstLoad.current) {
        // On the first load after login, just remember what already
        // exists -- don't pop up a toast for old history.
        fresh.forEach((n) => seenIds.current.add(n.id));
        firstLoad.current = false;
        saveSeen(role, seenIds.current);
      } else {
        const brandNew = fresh.find((n) => !seenIds.current.has(n.id) && !n.is_read);
        if (brandNew) {
          setToast(brandNew);
          setTimeout(() => setToast((current) => (current && current.id === brandNew.id ? null : current)), 6000);
        }
        fresh.forEach((n) => seenIds.current.add(n.id));
      }
      saveSeen(role, seenIds.current);

      setNotifications(fresh);
    } catch (error) {
      // Silently ignore; the bell simply stays empty if the call fails.
    }
  }

  useEffect(() => {
    firstLoad.current = true;
    seenIds.current = loadSeen(role);
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleOpen() {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      try {
        await markAllNotificationsRead(role);
        setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      } catch (error) {
        // Ignore; notifications will still show, just not marked read.
      }
    }
  }

  if (!role) return null;

  return (
    <div className="notif-bell-wrap" ref={panelRef}>
      {toast && (
        <div className="notif-toast" onClick={() => setToast(null)}>
          <div className="notif-toast-title">{toast.title}</div>
          <div className="notif-toast-message">{toast.message}</div>
        </div>
      )}
      <button className="notif-bell" onClick={handleOpen}>
        {t("Notifications")}
        {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          {notifications.length === 0 && <div className="notif-empty">{t("No notifications yet.")}</div>}
          {notifications.map((n) => (
            <div className={`notif-item ${n.is_read ? "" : "unread"}`} key={n.id}>
              <div className="notif-title">{n.title}</div>
              <div>{n.message}</div>
              <div className="notif-time">{timeAgo(n.created_at, t)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
