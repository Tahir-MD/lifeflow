import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext.jsx";
import { useToast } from "./ToastContext.jsx";
import { sendAppFeedback } from "../services/api";

/**
 * A small pop up asking what the person thinks of the app. It shows ONE time after every login,
 * and nowhere else in the app. They can send it or press Later.
 */
export default function FeedbackPopup() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    let timer;
    function check() {
      let due = false;
      try { due = localStorage.getItem("lifeflow_feedback_due") === "1" && Boolean(localStorage.getItem("lifeflow_token")); } catch (e) { due = false; }
      if (due) {
        clearTimeout(timer);
        timer = setTimeout(() => setOpen(true), 2500);
      }
    }
    check();
    window.addEventListener("lifeflow-login", check);
    return () => { clearTimeout(timer); window.removeEventListener("lifeflow-login", check); };
  }, []);

  function close() {
    try { localStorage.removeItem("lifeflow_feedback_due"); } catch (e) { /* ignore */ }
    setOpen(false);
    setStars(0);
    setComment("");
  }

  if (!open) return null;

  async function handleSend() {
    if (!stars) return;
    try {
      await sendAppFeedback(stars, comment);
      toast(t("Thank you for your feedback."));
      close();
    } catch (error) {
      toast(t("Could not send your feedback. Please try again."), "error");
    }
  }

  return (
    <div className="feedback-popup" role="dialog" aria-label={t("App feedback")}>
      <h3>{t("How is the LifeFlow app?")}</h3>
      <p className="subtitle" style={{ marginBottom: 10 }}>{t("Tell us what you think about the app.")}</p>
      <div className="feedback-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={n <= stars ? "star on" : "star"} onClick={() => setStars(n)} aria-label={`${n}`}>★</button>
        ))}
      </div>
      <textarea rows={2} placeholder={t("Write a short comment (optional)")} value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="feedback-actions">
        <button type="button" onClick={handleSend} disabled={!stars}>{t("Send feedback")}</button>
        <button type="button" className="btn-outline" onClick={close}>{t("Later")}</button>
      </div>
    </div>
  );
}
