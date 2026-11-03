import React, { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import { getChat, sendChat } from "../services/api";

/** A small online chat between the donor and the patient (or hospital) for one donation. */
export default function ChatBox({ donationId }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef(null);

  const load = useCallback(async () => {
    try { setMessages((await getChat(donationId)).data); } catch (e) { /* chat closed or offline */ }
  }, [donationId]);

  useEffect(() => {
    if (!open) return undefined;
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [open, load]);

  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: "nearest" }); }, [messages]);

  async function send(event) {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      await sendChat(donationId, text.trim());
      setText("");
      setError("");
      load();
    } catch (e) { setError(t("Could not send. Please try again.")); }
  }

  return (
    <div className="chat-box">
      <button type="button" className="btn-outline" onClick={() => setOpen(!open)}>
        💬 {open ? t("Close chat") : t("Chat online")}
      </button>
      {open && (
        <div className="chat-panel">
          <div className="chat-messages">
            {messages.length === 0 && <p className="empty-state">{t("No messages yet.")}</p>}
            {messages.map((m) => (
              <div key={m.id} className={"chat-msg " + (m.mine ? "chat-mine" : "chat-theirs")}>
                <span>{m.text}</span>
                <small>{new Date(m.created_at + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form className="chat-form" onSubmit={send}>
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Write a message")} maxLength={500}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }} />
            <button type="submit" className="chat-send">{t("Send")}</button>
          </form>
          {error && <p className="error-text">{error}</p>}
        </div>
      )}
    </div>
  );
}
