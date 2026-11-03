import React, { useEffect, useState } from "react";
import TabIcon from "../components/TabIcon.jsx";
import {
  listBloodRequests,
  acceptRequest,
  getMyPendingDonations,
  cancelMyDonation,
  getMyDonorProfile,
  getDonorDonationHistory,
  getDonorStats,
  listUpcomingCamps,
  rsvpToCamp,
  listMyRsvps,
} from "../services/api";
import PrintButton from "../components/PrintButton.jsx";
import PrintHeader from "../components/PrintHeader.jsx";
import DonorIdCard from "../components/DonorIdCard.jsx";
import { ShieldCheckIcon } from "../components/Icons.jsx";
import CertificatesPanel from "../components/CertificatesPanel.jsx";
import NextEligibleCard from "../components/NextEligibleCard.jsx";
import ReferralPanel from "../components/ReferralPanel.jsx";
import HealthChat from "../components/HealthChat.jsx";
import VoiceAssistantCard from "../components/VoiceAssistantCard.jsx";
import { eligibilityPayload } from "../components/EligibilityForm.jsx";
import { recheckMyEligibility } from "../services/api";
import ContactButtons from "../components/ContactButtons.jsx";
import ChatBox from "../components/ChatBox.jsx";
import DonorTrackButtons from "../components/DonorTrackButtons.jsx";
import RequestProgress from "../components/RequestProgress.jsx";
import { describeUrgency } from "../utils/format.js";
import { useToast } from "../components/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { serverMessage } from "../utils/validators.js";

const TABS = [
  { key: "requests", label: "Open requests" },
  { key: "history", label: "My donations & certificates" },
  { key: "camps", label: "Donation camps" },
  { key: "stats", label: "My stats & invite friends" },
  { key: "voice", label: "Health check" },
];

export default function DonorDashboard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState("requests");
  const [chatSave, setChatSave] = useState(null);
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [donateAmounts, setDonateAmounts] = useState({});
  const [message, setMessage] = useState("");
  const [acceptedContact, setAcceptedContact] = useState(null);

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [camps, setCamps] = useState([]);
  const [myRsvpCampIds, setMyRsvpCampIds] = useState([]);
  const [pendingMine, setPendingMine] = useState([]);
  const [detailRequest, setDetailRequest] = useState(null);
  const [dismissedIds, setDismissedIds] = useState([]);

  async function loadRequests() {
    const response = await listBloodRequests();
    setRequests(response.data.filter((item) => item.status === "open"));
  }

  async function loadProfile() {
    try {
      const response = await getMyDonorProfile();
      setProfile(response.data);
    } catch (error) {
      setProfile(null);
    }
  }

  async function loadHistory() {
    try {
      const response = await getDonorDonationHistory();
      setHistory(response.data);
    } catch (error) {
      setHistory([]);
    }
  }

  async function loadStats() {
    try {
      const response = await getDonorStats();
      setStats(response.data);
    } catch (error) {
      setStats(null);
    }
  }

  async function loadCamps() {
    try {
      const [campsResponse, rsvpResponse] = await Promise.all([listUpcomingCamps(), listMyRsvps()]);
      setCamps(campsResponse.data);
      setMyRsvpCampIds(rsvpResponse.data.map((r) => r.camp_id));
    } catch (error) {
      setCamps([]);
    }
  }

  useEffect(() => {
    loadProfile();
    loadRequests();
    loadPending();
    loadHistory();
    loadStats();
    loadCamps();
    const timer = setInterval(loadPending, 30000);   // so the donor sees when the patient answers
    return () => clearInterval(timer);
  }, []);

  function handleAmountChange(requestId, value) {
    setDonateAmounts({ ...donateAmounts, [requestId]: value });
  }

  async function loadPending() {
    try { setPendingMine((await getMyPendingDonations()).data); } catch (error) { setPendingMine([]); }
  }
  async function handleCancelPledge(id) {
    try { await cancelMyDonation(id); loadPending(); loadRequests(); } catch (error) { /* stays as it was */ }
  }

  async function handleAccept(request) {
    const chosenAmount = Math.min(Math.max(parseInt(donateAmounts[request.id], 10) || 1, 1), 3);   // a donor can give at most 3 bags
    try {
      const response = await acceptRequest(request.id, chosenAmount);
      setMessage(response.data.message);
      toast(t("Done successfully."));
      setAcceptedContact({ ...response.data, request_id: request.id });
      setDetailRequest(null);
      loadRequests();
      loadPending();
      loadProfile();
      loadHistory();
      loadStats();
    } catch (error) {
      setMessage(serverMessage(error, "Could not accept this request. It may already be fully covered."));
    }
  }

  function handleReject(requestId) {
    setDismissedIds([...dismissedIds, requestId]);
    setDetailRequest(null);
  }

  async function handleRsvp(campId) {
    try {
      await rsvpToCamp(campId);
      loadCamps();
    } catch (error) {
      // The camp list already prevents duplicate RSVPs visually.
    }
  }

  return (
    <div className="page">
      {profile && profile.medical_clearance_status !== "cleared" && (
        <p className="error-text" role="status">{t("The admin has not verified your account yet. You can donate blood after it is verified.")}</p>
      )}
      {profile && (
        <div className="profile-bar">
          <div>
            <span className="role-tag">{t("Donor")}</span>
            <span className="name">{profile.full_name}</span>
            &nbsp; ({profile.blood_type})
            {profile.medical_clearance_status === "cleared" && (
              <span className="source-tag" style={{ marginLeft: "10px" }}>{t("Medically cleared")}</span>
            )}
            {profile.medical_clearance_status === "flagged" && (
              <span className="empty-state" style={{ marginLeft: "10px" }}>{t("Flagged — contact support")}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span>{profile.points} {t("points")}</span>
          </div>
        </div>
      )}

      <NextEligibleCard />

      <div className="tab-row">
        {TABS.map((tb) => (
          <button key={tb.key} className={`tab-button ${tab === tb.key ? "active" : ""}`} onClick={() => setTab(tb.key)}>
            <TabIcon name={tb.key} /> {t(tb.label)}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <>
          {pendingMine.length > 0 && (
            <div className="card">
              <h2>{t("Your donations in progress")}</h2>
              <p className="subtitle">{t("A donation counts after the hospital or the patient confirms the blood was received.")}</p>
              {pendingMine.map((d) => (
                <div className="list-row-stack" key={d.id}>
                  <div className="list-row-top">
                    <div className="meta">{d.units} {t("bag(s)")} · {d.patient_name ? `${t("patient")} ${d.patient_name}` : `${t("request")} #${d.request_id}`} · <strong>{t(d.status === "offered" ? "Waiting for the patient to answer" : d.status === "accepted" ? "Patient said yes - please give blood" : "Waiting for the hospital to confirm")}</strong></div>
                    <button className="inline-btn btn-outline" onClick={() => handleCancelPledge(d.id)}>{t("Cancel my promise")}</button>
                  </div>
                  {d.requester_phone && (
                    <div className="empty-state">{d.requester_name} · {d.requester_phone}</div>
                  )}
                  {d.requester_phone && <ContactButtons phone={d.requester_phone} email={d.requester_email} />}
                  <ChatBox donationId={d.id} />
                  {(d.status === "accepted" || d.status === "pending") && <DonorTrackButtons requestId={d.request_id} />}
                </div>
              ))}
            </div>
          )}
          {acceptedContact && (
            <div className="card">
              <h2>{t("You accepted a request")}</h2>
              <p className="notice-text">{acceptedContact.message}</p>
              <div className="contact-block">
                <div className="contact-label">
                  {t("Go to, or call,")} {acceptedContact.requester_type === "hospital" ? t("the hospital") : t("the patient's contact")}
                </div>
                <div className="contact-name">
                  {acceptedContact.requester_name}
                  {acceptedContact.patient_name ? ` — ${t("patient")}: ${acceptedContact.patient_name}` : ""}
                </div>
                <div className="contact-phone">{acceptedContact.requester_phone}</div>
              </div>
            </div>
          )}

          <div className="card">
            <h2>{t("Open emergency requests")}</h2>
            <p className="subtitle">{t("Ranked by how urgently your blood type is needed nearby.")}</p>
            {!acceptedContact && message && <p className="notice-text">{message}</p>}
            {requests.filter((r) => !dismissedIds.includes(r.id)).length === 0 && (
              <p className="empty-state">{t("There are no open requests right now. You will be notified the moment one appears.")}</p>
            )}
            {requests.filter((r) => !dismissedIds.includes(r.id)).map((request) => (
              <div className="list-row-stack" key={request.id}>
                <div className="list-row-top">
                  <div className="meta">
                    <span className={request.requester_type === "hospital" ? "tag-hospital" : "tag-receiver"}>
                      {request.requester_type === "hospital" ? "Hospital" : "Patient"}
                    </span>
                    &nbsp;
                    <span className="badge">{request.blood_type_needed}</span>
                    &nbsp; {request.requester_name}
                  </div>
                </div>

                <div className="empty-state">
                  {t("{remaining} of {needed} still needed", { remaining: request.units_remaining, needed: request.units_needed })} {t(request.units_needed === 1 ? "bag" : "bags")}
                  &nbsp;·&nbsp; {describeUrgency(request, t)}
                  {request.patient_name ? ` · ${t("Patient")}: ${request.patient_name}` : ""}
                  {request.patient_age ? `, ${t("age")} ${request.patient_age}` : ""}
                  {request.patient_gender ? ` (${request.patient_gender})` : ""}
                </div>
                <RequestProgress request={request} />
                {request.medical_reason && <div className="empty-state">{t("Reason:")} {request.medical_reason}</div>}
                {request.inventory_units_used > 0 && (
                  <div className="empty-state"><span className="source-tag">{request.inventory_units_used} {t("bag(s) already covered from hospital stock")}</span></div>
                )}

                {request.requester_type === "receiver" && (
                  <div className="empty-state">
                    {t("CNIC:")} {request.requester_cnic} &nbsp;·&nbsp; {t("Address:")} {request.requester_address} &nbsp;·&nbsp; {t("Phone:")} {request.requester_phone}
                  </div>
                )}
                {request.requester_type === "hospital" && (
                  <div className="empty-state">{t("Phone:")} {request.requester_phone}</div>
                )}
                <ContactButtons phone={request.requester_phone} />

                <div className="list-row-top" style={{ marginTop: "10px" }}>
                  <label style={{ margin: 0 }}>
                    {t("Bags you can give")}
                    <input
                      type="number"
                      min="1"
                      max={Math.min(3, request.units_remaining)}
                      defaultValue="1"
                      style={{ width: "90px", marginTop: "6px" }}
                      onChange={(event) => handleAmountChange(request.id, event.target.value)}
                    />
                  </label>
                  <button onClick={() => handleAccept(request)}>{t("Yes, I can donate")}</button>
                  <button className="btn-outline" onClick={() => setDetailRequest(request)}>{t("View full details")}</button>
                  <button className="btn-outline" onClick={() => handleReject(request.id)}>{t("No")}</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="card">
          <PrintHeader title="My donation history" subtitle={profile ? `${profile.full_name} · ${profile.blood_type}` : ""} />
          <div className="list-row-top">
            <h2>{t("My donation history")}</h2>
            <PrintButton />
          </div>
          <p className="subtitle no-print">{t("Every bag you have given, and exactly who received it.")}</p>
          {history.length === 0 && <p className="empty-state">{t("You have not made a donation yet.")}</p>}
          {history.map((item) => (
            <div className="list-row-stack" key={item.donation_id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className={item.requester_type === "hospital" ? "tag-hospital" : "tag-receiver"}>
                    {item.requester_type === "hospital" ? "Hospital" : "Patient"}
                  </span>
                  &nbsp; <span className="badge">{item.blood_type_needed}</span>
                  &nbsp; {item.requester_name}
                </div>
                <span className="distance">{new Date(item.donated_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {item.units_donated} {t(item.units_donated === 1 ? "bag" : "bags")} {t("donated")}
                {item.patient_name ? ` · ${t("Patient")}: ${item.patient_name}` : ""} · {t("Request status:")} {t(item.request_status)}
              </div>
              {item.requester_type === "receiver" && (
                <div className="empty-state">
                  {t("CNIC:")} {item.requester_cnic} &nbsp;·&nbsp; {t("Address:")} {item.requester_address} &nbsp;·&nbsp; {t("Phone:")} {item.requester_phone}
                </div>
              )}
              {item.requester_type === "hospital" && (
                <div className="empty-state">{t("Phone:")} {item.requester_phone}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "camps" && (
        <div className="card">
          <h2>{t("Upcoming donation camps")}</h2>
          <p className="subtitle">{t("Organized blood drives from nearby hospitals. Register to reserve a slot.")}</p>
          {camps.length === 0 && <p className="empty-state">{t("No camps are scheduled right now.")}</p>}
          {camps.map((camp) => (
            <div className="list-row-stack" key={camp.id}>
              <div className="list-row-top">
                <div className="meta">
                  <strong>{camp.title}</strong> &nbsp; <span className="tag-hospital">{camp.hospital_name}</span>
                </div>
                <span className="distance">{new Date(camp.camp_date).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {camp.location_label} · {camp.registered_count} {t(camp.registered_count === 1 ? "donor" : "donors")} {t("registered")}
                {camp.description ? ` · ${camp.description}` : ""}
              </div>
              {myRsvpCampIds.includes(camp.id) ? (
                <p className="notice-text">{t("You are registered for this camp.")}</p>
              ) : (
                <button className="inline-btn" onClick={() => handleRsvp(camp.id)}>{t("Register to attend")}</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "history" && <CertificatesPanel />}

      {tab === "stats" && <ReferralPanel />}

      {tab === "voice" && (
        <>
          <div className="card">
            <h2>{t("Health check chat")}</h2>
            <p className="subtitle">{t("Answer a few simple questions in your language, by tapping, typing or speaking. You can save the result to your profile.")}</p>
            <HealthChat onComplete={(values, result) => { setChatSave({ values, result, saved: false, error: "" }); }} />
            {chatSave && (
              <div style={{ marginTop: "10px" }}>
                {!chatSave.saved && (
                  <button type="button" onClick={async () => {
                    try { await recheckMyEligibility(eligibilityPayload(chatSave.values)); setChatSave({ ...chatSave, saved: true, error: "" }); }
                    catch (e) { setChatSave({ ...chatSave, error: "Could not save the result." }); }
                  }}>{t("Save this result to my profile")}</button>
                )}
                {chatSave.saved && <p className="success-text">✅ {t("Saved to your profile.")}</p>}
                {chatSave.error && <p className="error-text" role="alert">{t(chatSave.error)}</p>}
              </div>
            )}
          </div>
          <div className="card">
            <h2>{t("Ask LifeFlow by voice")}</h2>
            <VoiceAssistantCard />
          </div>
        </>
      )}

      {tab === "stats" && stats && (
        <div className="card">
          <h2>{t("My stats & badges")}</h2>
          <p className="subtitle">
            <span className="badge-tier">{stats.badge_tier}</span>
          </p>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total_donations}</div>
              <div className="stat-label">{t("Total donations")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_units_donated}</div>
              <div className="stat-label">{t("Bags given")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.estimated_lives_impacted}</div>
              <div className="stat-label">{t("Estimated lives impacted")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.points}</div>
              <div className="stat-label">{t("Points")}</div>
            </div>
          </div>
          <p className="empty-state">
            {stats.is_eligible_now
              ? t("You are eligible to donate right now.")
              : t("You will be eligible again on {date}.", { date: new Date(stats.next_eligible_date).toLocaleDateString() })}
          </p>
        </div>
      )}
      {tab === "stats" && profile && stats && (
        <DonorIdCard profile={profile} donationCount={stats.total_donations} />
      )}

      {detailRequest && (
        <div className="modal-backdrop" onClick={() => setDetailRequest(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailRequest(null)}>{t("Close")}</button>
            <h2><ShieldCheckIcon size={20} color="#B01E28" /> {t("Full request details")}</h2>
            <p className="subtitle">{t("Review everything before you accept or reject.")}</p>
            <div className="detail-row"><span className="detail-label">{t("Requested by")}</span><span className="detail-value">{detailRequest.requester_name} ({detailRequest.requester_type === "hospital" ? t("Hospital") : t("Patient")})</span></div>
            <div className="detail-row"><span className="detail-label">{t("Phone")}</span><span className="detail-value">{detailRequest.requester_phone}</span></div>
            {detailRequest.requester_type === "receiver" && (
              <>
                <div className="detail-row"><span className="detail-label">{t("CNIC")}</span><span className="detail-value">{detailRequest.requester_cnic}</span></div>
                <div className="detail-row"><span className="detail-label">{t("Address")}</span><span className="detail-value">{detailRequest.requester_address}</span></div>
              </>
            )}
            <div className="detail-row"><span className="detail-label">{t("Patient")}</span><span className="detail-value">{detailRequest.patient_name || t("Not provided")}</span></div>
            <div className="detail-row"><span className="detail-label">{t("Age / gender")}</span><span className="detail-value">{detailRequest.patient_age || "—"} {detailRequest.patient_gender ? `/ ${detailRequest.patient_gender}` : ""}</span></div>
            <div className="detail-row"><span className="detail-label">{t("Reason")}</span><span className="detail-value">{detailRequest.medical_reason || t("Not provided")}</span></div>
            <div className="detail-row"><span className="detail-label">{t("Blood type")}</span><span className="detail-value">{detailRequest.blood_type_needed}</span></div>
            <div className="detail-row"><span className="detail-label">{t("Bags needed / remaining")}</span><span className="detail-value">{detailRequest.units_needed} / {detailRequest.units_remaining}</span></div>
            <div className="detail-row"><span className="detail-label">{t("Urgency")}</span><span className="detail-value">{describeUrgency(detailRequest, t)}</span></div>
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button onClick={() => handleAccept(detailRequest)}>{t("Yes, I can donate")}</button>
              <button className="btn-outline" onClick={() => handleReject(detailRequest.id)}>{t("No")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
