import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { SendIcon } from "./Icons.jsx";
import RobotIcon from "./RobotIcon.jsx";
import {
  getAiStatus, askDonorAssistant, askReceiverAssistant, askHospitalAssistant,
  askAdminAssistant, askStaffAssistant, askGuestAssistant, getMyProfile,
} from "../services/api";
import { useI18n } from "../i18n/I18nContext.jsx";

const ASK_FUNCTIONS = {
  donor: askDonorAssistant,
  receiver: askReceiverAssistant,
  hospital: askHospitalAssistant,
  admin: askAdminAssistant,
  staff: askStaffAssistant,
  guest: askGuestAssistant,
};

// The first line greets the person by name once they are logged in ({name} is filled in).
const WELCOME_MESSAGE = {
  donor: "Hi {name}! I'm your LifeFlow assistant. Ask me about eligibility, points, matching, or how to read a request before accepting it.",
  receiver: "Hi {name}! I'm your LifeFlow assistant. Ask me about your request status, how hospital stock requests work, or how to rate a donor.",
  hospital: "Hi {name}! I'm your LifeFlow assistant. Ask me about your inventory, stock requests, shortage forecasts, staff shifts, or donor matching.",
  admin: "Hi {name}! I'm your LifeFlow assistant. Ask me about platform-wide trends, moderation, or how any feature works.",
  staff: "Hi {name}! I'm your LifeFlow assistant. Ask me how to log a visitor, check in for your shift, or print your shift record.",
  guest: "Hi! I'm the LifeFlow assistant. Ask me how LifeFlow works, how blood type matching works, or how to register as a donor, patient, or hospital.",
};

/**
 * One assistant for everybody. It is rendered once in App.jsx, so it shows on every page for every kind of user,
 * and when someone is logged in it greets them by name and answers for their role.
 */
export default function AIAssistantWidget() {
  const { t } = useI18n();
  const location = useLocation();
  const token = localStorage.getItem("lifeflow_token");
  const storedRole = localStorage.getItem("lifeflow_role");
  const role = token && ASK_FUNCTIONS[storedRole] ? storedRole : "guest";
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    getAiStatus()
      .then((response) => setIsConfigured(response.data.configured))
      .catch(() => setIsConfigured(false));
  }, []);

  // Who is this? Looked up again after every login, logout or page change.
  useEffect(() => {
    setMessages([]);
    if (role === "guest") { setName(""); return; }
    let cancelled = false;
    getMyProfile()
      .then((response) => {
        if (cancelled) return;
        const full = (response.data && response.data.name) || "";
        setName(role === "hospital" || role === "admin" ? full : full.split(" ")[0]);
      })
      .catch(() => { if (!cancelled) setName(""); });
    return () => { cancelled = true; };
  }, [role, token]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  async function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    const askFunction = ASK_FUNCTIONS[role];
    setMessages((prev) => [...prev, { from: "user", text }]);
    setDraft("");
    setIsSending(true);
    try {
      const response = await askFunction(text);
      setMessages((prev) => [...prev, { from: "ai", text: response.data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { from: "ai", text: t("Sorry, something went wrong reaching the assistant. Please try again.") }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="ai-widget">
      {isOpen && (
        <div className="ai-panel">
          <div className="ai-panel-head">
            <span className="ai-head-title"><span className="ai-head-robot"><RobotIcon size={26} /></span> {t("LifeFlow AI assistant")}</span>
            <button className="ai-panel-close" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="ai-panel-body" ref={scrollRef}>
            {isConfigured === false && (
              <div className="ai-bubble ai-bubble-ai">
                {t("The AI assistant isn't turned on for this server yet. Ask your admin to set the")}
                <code> {t("GROQ_API_KEY")}</code> {t("environment variable (a free key is available at console.groq.com/keys) and restart the backend.")}
              </div>
            )}
            {isConfigured !== false && <div className="ai-bubble ai-bubble-ai">{name ? t(WELCOME_MESSAGE[role], { name }) : t(WELCOME_MESSAGE.guest)}</div>}
            {messages.map((message, index) => (
              <div className={`ai-bubble ${message.from === "user" ? "ai-bubble-user" : "ai-bubble-ai"}`} key={index}>
                {message.text}
              </div>
            ))}
            {isSending && <div className="ai-bubble ai-bubble-ai ai-bubble-typing">{t("Thinking…")}</div>}
          </div>
          <form className="ai-panel-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder={t("Ask anything about LifeFlow…")}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" aria-label={t("Send")} disabled={isSending}><SendIcon size={16} color="#fff" /></button>
          </form>
        </div>
      )}
      <div className="ai-launcher">
        {!isOpen && (
          <div className="ai-hello" role="status">
            <strong>{name ? t("Hello {name}!", { name }) : t("Hello!")}</strong>
            <span>{t("How can I help you?")}</span>
          </div>
        )}
        <button className="ai-fab" onClick={() => setIsOpen(!isOpen)} aria-label={t("Open AI assistant")}>
          <RobotIcon size={42} />
        </button>
      </div>
    </div>
  );
}
