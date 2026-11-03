import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import { listBackups, runBackupNow, downloadBackup } from "../services/api";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Admin: see the automatic database backups, take one now, and download any of them. */
export default function BackupPanel() {
  const { t } = useI18n();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function load() {
    listBackups().then((r) => setInfo(r.data)).catch(() => setError(t("Could not load the backups.")));
  }
  useEffect(load, []);

  async function backupNow() {
    setBusy(true); setError(""); setMessage("");
    try { await runBackupNow(); setMessage(t("Backup created.")); load(); }
    catch (e) { setError(e?.response?.data?.detail || t("Backup failed.")); }
    finally { setBusy(false); }
  }

  async function download(name) {
    try { await downloadBackup(name); } catch (e) { setError(t("Could not download the backup.")); }
  }

  return (
    <div className="card">
      <h2>{t("Database backups")}</h2>
      <p className="subtitle">
        {info?.enabled
          ? `${t("Automatic backup every")} ${info.every_hours} ${t("hours; the newest")} ${info.keep} ${t("are kept.")}`
          : t("Automatic backups are switched off on this server.")}
      </p>
      <button type="button" onClick={backupNow} disabled={busy}>{busy ? t("Working…") : t("Back up now")}</button>
      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
      {info && info.backups.length === 0 && <div className="empty-state">{t("No backups yet.")}</div>}
      {info && info.backups.map((b) => (
        <div className="list-row-stack" key={b.name}>
          <div className="list-row-top">
            <div className="meta">{b.name}</div>
            <span className="distance">{new Date(b.created_at).toLocaleString()} · {formatSize(b.size_bytes)}</span>
          </div>
          <button type="button" className="btn-outline" onClick={() => download(b.name)}>{t("Download")}</button>
        </div>
      ))}
      <p className="field-hint">{t("Keep a copy somewhere else too (another computer or cloud storage). To restore, stop the server and run scripts/restore_backup.py.")}</p>
    </div>
  );
}
