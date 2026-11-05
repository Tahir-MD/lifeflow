import React, { useEffect, useState } from "react";
import TabIcon from "../components/TabIcon.jsx";
import VoiceRecorderButton from "../components/VoiceRecorderButton.jsx";
import {
  createReceiverRequest,
  getMatches,
  getMyReceiverProfile,
  getReceiverDonationHistory,
  getReceiverRequestHistory,
  getReceiverStats,
  getAllHospitalInventories,
  getRequesterRatings,
  parseRequestText,
  resolvePlace,
} from "../services/api";
import PrintButton from "../components/PrintButton.jsx";
import PrintHeader from "../components/PrintHeader.jsx";
import TextField from "../components/form/TextField.jsx";
import PasswordField from "../components/form/PasswordField.jsx";
import PhoneField from "../components/form/PhoneField.jsx";
import RequestLocation from "../components/form/RequestLocation.jsx";
import LocationPicker, { EMPTY_LOCATION } from "../components/form/LocationPicker.jsx";
import PatientOffers from "../components/PatientOffers.jsx";
import SosButton from "../components/SosButton.jsx";
import { TrackToggle } from "../components/RequestTimeline.jsx";
import VoiceAssistantCard from "../components/VoiceAssistantCard.jsx";
import SlipScanner from "../components/SlipScanner.jsx";
import RequestInsights from "../components/RequestInsights.jsx";
import CampForecast from "../components/CampForecast.jsx";
import {
  nameError, emailError, passwordError, phoneError, numberError, locationErrors, hasErrors, serverMessage,
} from "../utils/validators.js";
import RequestProgress from "../components/RequestProgress.jsx";
import RequestStatusBar from "../components/RequestStatusBar.jsx";
import { describeUrgency } from "../utils/format.js";
import { useToast } from "../components/ToastContext.jsx";
import ContactButtons from "../components/ContactButtons.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

const TABS = [
  { key: "new", label: "Request blood" },
  { key: "myrequests", label: "My requests (full history)" },
  { key: "history", label: "Donations received" },
  { key: "stats", label: "Stats" },
];

export default function ReceiverDashboard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState("new");
  const [reqSubmitted, setReqSubmitted] = useState(false);
  const [reqLocation, setReqLocation] = useState({ ...EMPTY_LOCATION, other: false });
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    blood_type_needed: "O+",
    units_needed: 1,
    patient_name: "",
    patient_age: "",
    patient_gender: "",
    medical_reason: "",
    urgency_type: "emergency",
    urgency_value: "",
    latitude: "",
    longitude: "",
  });
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastRequestResult, setLastRequestResult] = useState(null);
  const [hospitalStock, setHospitalStock] = useState([]);
  const [myRating, setMyRating] = useState(null);
  const [aiIntakeText, setAiIntakeText] = useState("");
  const [aiIntakeNote, setAiIntakeNote] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);

  const [history, setHistory] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [stats, setStats] = useState(null);

  async function loadProfile() {
    try {
      const response = await getMyReceiverProfile();
      setProfile(response.data);
      getRequesterRatings("receiver", response.data.id).then((r) => setMyRating(r.data)).catch(() => setMyRating(null));
    } catch (error) {
      setProfile(null);
    }
  }
  async function loadHospitalStock() {
    try {
      const response = await getAllHospitalInventories();
      setHospitalStock(response.data);
    } catch (error) {
      setHospitalStock([]);
    }
  }
  function applyAiFields(fields) {
    setForm((prev) => ({ ...prev, ...fields }));
    setAiIntakeNote("Form filled — please review before sending.");
  }
  async function handleAiAutofill() {
    if (!aiIntakeText.trim()) return;
    setIsAutofilling(true);
    setAiIntakeNote("");
    try {
      const response = await parseRequestText(aiIntakeText, (profile && profile.latitude) || 0, (profile && profile.longitude) || 0);
      const parsed = response.data;
      if (!parsed.understood) {
        setAiIntakeNote(parsed.note_to_user || "Couldn't understand that — please fill the form manually.");
        return;
      }
      setForm({
        ...form,
        blood_type_needed: parsed.blood_type_needed || form.blood_type_needed,
        units_needed: parsed.units_needed || form.units_needed,
        patient_name: parsed.patient_name || form.patient_name,
        patient_age: parsed.patient_age || form.patient_age,
        patient_gender: parsed.patient_gender || form.patient_gender,
        medical_reason: parsed.medical_reason || form.medical_reason,
        urgency_type: parsed.urgency_type || form.urgency_type,
        urgency_value: parsed.urgency_value || form.urgency_value,
      });
      setAiIntakeNote(parsed.note_to_user || "Form filled — please review before sending.");
    } catch (error) {
      setAiIntakeNote("Could not reach the AI assistant just now.");
    } finally {
      setIsAutofilling(false);
    }
  }
  async function loadHistory() {
    try {
      const response = await getReceiverDonationHistory();
      setHistory(response.data);
    } catch (error) {
      setHistory([]);
    }
  }
  async function loadMyRequests() {
    try {
      const response = await getReceiverRequestHistory();
      setMyRequests(response.data);
    } catch (error) {
      setMyRequests([]);
    }
  }
  async function loadStats() {
    try {
      const response = await getReceiverStats();
      setStats(response.data);
    } catch (error) {
      setStats(null);
    }
  }

  useEffect(() => {
    loadProfile();
    loadHistory();
    loadMyRequests();
    loadStats();
    loadHospitalStock();
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setReqSubmitted(true);
    if (!profile || hasErrors(reqErrors)) {
      setErrorMessage("Some answers need to be fixed. Please look at the red messages.");
      return;
    }
    try {
      const position = reqLocation.other ? await resolvePlace(reqLocation) : { latitude: profile.latitude, longitude: profile.longitude };
      const response = await createReceiverRequest({
        ...form,
        units_needed: parseInt(form.units_needed, 10),
        patient_age: form.patient_age ? parseInt(form.patient_age, 10) : null,
        urgency_value: form.urgency_type === "emergency" ? null : parseInt(form.urgency_value, 10),
        latitude: position.latitude,
        longitude: position.longitude,
        patient_name: form.patient_name.trim() || null,
      });
      setLastRequestResult(response.data);
      if (response.data.units_remaining > 0) {
        const matchResponse = await getMatches(response.data.id);
        setMatches(matchResponse.data);
      } else {
        setMatches([]);
      }
      setSearched(true);
      loadMyRequests();
      toast(t("Request sent successfully."));
      // Clear the form so the next request starts empty.
      setForm({ blood_type_needed: "O+", units_needed: 1, patient_name: "", patient_age: "", patient_gender: "",
        medical_reason: "", urgency_type: "emergency", urgency_value: "", latitude: "", longitude: "" });
      setReqLocation({ ...EMPTY_LOCATION, other: false });
      setReqSubmitted(false);
      setAiIntakeText("");
    } catch (error) {
      setErrorMessage(serverMessage(error, "Could not create the request. Please check your details and login status."));
    }
  }

  const reqErrors = {
    units_needed: numberError(form.units_needed, { min: 1, max: 20 }),
    patient_name: nameError(form.patient_name, false),
    patient_age: form.patient_age === "" ? "" : numberError(form.patient_age, { min: 0, max: 120 }),
    urgency_value: form.urgency_type === "emergency" ? "" : numberError(form.urgency_value, { min: 1, max: form.urgency_type === "days" ? 365 : 24 }),
    place: reqLocation.other ? (hasErrors({ a: locationErrors(reqLocation).city, b: locationErrors(reqLocation).area, c: locationErrors(reqLocation).map }) ? "x" : "") : "",
  };

  return (
    <div className="page">
      {profile && (
        <div className="profile-bar">
          <div>
            <span className="role-tag">{t("Patient")}</span>
            <span className="name">{profile.full_name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {myRating && myRating.average_stars && (
              <span className="avg-rating-chip">★ {myRating.average_stars} ({myRating.total_ratings})</span>
            )}
            <span>{profile.phone_number}</span>
          </div>
        </div>
      )}

      <PatientOffers onChanged={() => { loadMyRequests(); loadHistory(); loadStats(); }} />

      <SosButton onSent={() => { if (typeof loadMyRequests === "function") loadMyRequests(); }} />

      <div className="tab-row">
        {TABS.map((tb) => (
          <button key={tb.key} className={`tab-button ${tab === tb.key ? "active" : ""}`} onClick={() => setTab(tb.key)}>
            <TabIcon name={tb.key} /> {t(tb.label)}
          </button>
        ))}
      </div>

      {tab === "new" && (
        <>
          <div className="card">
            <h2>{t("Hospital stock near you")}</h2>
            <p className="subtitle">
              {t("We always check hospital blood banks for")} <strong>{form.blood_type_needed}</strong> {t("before contacting a single donor. Here is what nearby hospitals currently report.")}
            </p>
            {hospitalStock.length === 0 && (
              <p className="empty-state">{t("No hospital has published inventory yet. Donors will still be matched normally.")}</p>
            )}
            {hospitalStock.map((hospital) => {
              const row = (hospital.items || []).find((item) => item.blood_type === form.blood_type_needed);
              if (!row) return null;
              return (
                <div className="list-row" key={hospital.hospital_id}>
                  <div className="meta">{hospital.hospital_name}</div>
                  <span className={row.units_available > 0 ? "source-tag" : "empty-state"}>
                    {row.units_available > 0
                      ? `${t("{n} bag(s) of {type} in stock", { n: row.units_available, type: form.blood_type_needed })}`
                      : "Out of stock"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h2>{t("Request blood")}</h2>
            <p className="subtitle">{t("Tell donors how many bags you need and how soon. Existing hospital stock is used automatically first.")}</p>
            {errorMessage && <p className="error-text" role="alert">{t(errorMessage)}</p>}

            <div className="ai-intake-box">
              <label>{t("Describe the need in your own words (any language) — AI will fill the form below")}</label>
              <textarea
                rows={2} placeholder={t("e.g. Mera walid ko O negative khoon chahiye, surgery hai")}
                value={aiIntakeText} onChange={(e) => setAiIntakeText(e.target.value)}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button type="button" className="btn-outline" style={{ marginTop: "10px" }} onClick={handleAiAutofill} disabled={isAutofilling}>
                  {isAutofilling ? "Reading..." : "Auto-fill with AI"}
                </button>
                <VoiceRecorderButton onTranscript={(text) => setAiIntakeText(text)} />
              </div>
              {aiIntakeNote && <p className="empty-state">{t(aiIntakeNote)}</p>}
            </div>

            <VoiceAssistantCard onFill={applyAiFields} />
            <SlipScanner onFill={applyAiFields} />

            <form onSubmit={handleSubmit} noValidate>
              <label>{t("Blood type needed")}</label>
              <select name="blood_type_needed" value={form.blood_type_needed} onChange={handleChange}>
                {BLOOD_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <TextField kind="number" label="Bags needed" name="units_needed" value={form.units_needed} onChange={handleChange} error={reqErrors.units_needed} submitted={reqSubmitted} min={1} max={20} placeholder="Bags needed" hint="One bag is about 350 ml of blood" />

              <TextField kind="name" label="Patient name, optional" name="patient_name" value={form.patient_name} onChange={handleChange} error={reqErrors.patient_name} submitted={reqSubmitted} required={false} placeholder="Patient name" />

              <TextField kind="number" label="Patient age, optional" name="patient_age" value={form.patient_age} onChange={handleChange} error={reqErrors.patient_age} submitted={reqSubmitted} required={false} min={0} max={120} placeholder="Patient age" />

              <label>{t("Patient gender, optional")}</label>
              <select name="patient_gender" value={form.patient_gender} onChange={handleChange}>
                <option value="">{t("Prefer not to say")}</option>
                <option value="Female">{t("Female")}</option>
                <option value="Male">{t("Male")}</option>
                <option value="Other">{t("Other")}</option>
              </select>

              <TextField label="Reason / condition, optional" name="medical_reason" value={form.medical_reason} onChange={handleChange} required={false} placeholder="e.g. surgery, accident, thalassemia" maxLength={150} />

              <label>{t("How soon is it needed")}</label>
              <select name="urgency_type" value={form.urgency_type} onChange={handleChange}>
                <option value="emergency">{t("Emergency, needed right now")}</option>
                <option value="days">{t("Needed within a number of days")}</option>
                <option value="months">{t("Needed within a number of months")}</option>
              </select>

              {form.urgency_type !== "emergency" && (
                <>
                  <TextField kind="number" label={form.urgency_type === "days" ? "Number of days" : "Number of months"} name="urgency_value" value={form.urgency_value} onChange={handleChange} error={reqErrors.urgency_value} submitted={reqSubmitted} min={1} placeholder="Number" />
                </>
              )}

              <RequestLocation profile={profile} value={reqLocation} onChange={setReqLocation} submitted={reqSubmitted} />

              <button type="submit">{t("Send request and find donors")}</button>
            </form>
          </div>

          {searched && lastRequestResult && lastRequestResult.inventory_units_used > 0 && (
            <div className="card">
              <h2>{t("Hospital stock checked first")}</h2>
              <p className="notice-text">
                <span className="source-tag">{t("Checked inventory before donors")}</span>
                &nbsp; {lastRequestResult.inventory_units_used} {t("bag(s) of")} {lastRequestResult.blood_type_needed} {t("were already available")}{lastRequestResult.fulfilling_hospital_name ? ` at ${lastRequestResult.fulfilling_hospital_name}` : ""} {t("and have been reserved for this request automatically.")}
              </p>
              {lastRequestResult.units_remaining > 0 && (
                <p className="empty-state">{lastRequestResult.units_remaining} {t("bag(s) are still short — nearby donors have been notified below.")}</p>
              )}
              {lastRequestResult.units_remaining === 0 && (
                <p className="empty-state">{t("The full request is covered from existing hospital stock. No donor call-out was needed.")}</p>
              )}
            </div>
          )}

          {searched && (
            <div className="card">
              <h2>{t("Matching donors")}</h2>
              <p className="subtitle">{t("Closest and most recently eligible donors appear first, with contact number.")}</p>
              {lastRequestResult && lastRequestResult.units_remaining === 0 && (
                <p className="empty-state">{t("No donor search was needed — see the stock notice above.")}</p>
              )}
              {(!lastRequestResult || lastRequestResult.units_remaining > 0) && matches.length === 0 && (
                <p className="empty-state">{t("No compatible donors were found within range for this request.")}</p>
              )}
              {matches.map((match) => (
                <div className="list-row-stack" key={match.donor_id}>
                  <div className="list-row-top">
                    <div className="meta">
                      <span className="badge">{match.blood_type}</span>
                      &nbsp; {match.full_name}
                    </div>
                    <span className="distance">{match.distance_kilometers} {t("km away")}</span>
                  </div>
                  {match.match_reason && <div className="match-reason">{t("Why this donor:")} {match.match_reason}</div>}
                  <div className="contact-block">
                    <div className="contact-label">{t("Contact this donor")}</div>
                    <div className="contact-phone">{match.phone_number}</div>
                    <ContactButtons phone={match.phone_number} email={match.email} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "myrequests" && (
        <div className="card">
          <PrintHeader title="My requests — full history" subtitle={profile ? profile.full_name : ""} />
          <div className="list-row-top">
            <h2>{t("My requests — full history")}</h2>
            <PrintButton />
          </div>
          <p className="subtitle no-print">{t("Every request you have ever sent, open, closed, or still waiting for a donor.")}</p>
          {myRequests.length === 0 && <p className="empty-state">{t("You have not sent a request yet.")}</p>}
          {myRequests.map((r) => (
            <div className="list-row-stack" key={r.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{r.blood_type_needed}</span>
                  &nbsp; {r.units_fulfilled}/{r.units_needed} {t("bags fulfilled")}
                </div>
                <span className="distance">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {t("Status:")} {t(r.display_status || r.status)} · {describeUrgency(r, t)}
                {r.patient_name ? ` · ${t("Patient")}: ${r.patient_name}` : ""}
              </div>
              <RequestStatusBar request={r} onChanged={() => { loadMyRequests(); }} />
              <RequestProgress request={r} />
              <TrackToggle requestId={r.id} />
              <RequestInsights requestId={r.id} showResponse={false} />
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="card">
          <PrintHeader title="Donations received" subtitle={profile ? profile.full_name : ""} />
          <div className="list-row-top">
            <h2>{t("Donations received")}</h2>
            <PrintButton />
          </div>
          <p className="subtitle no-print">{t("Every donation given against your requests, with full donor details.")}</p>
          {history.length === 0 && <p className="empty-state">{t("No donor has fulfilled a request yet.")}</p>}
          {history.map((item) => (
            <div className="list-row-stack" key={item.donation_id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{item.donor_blood_type}</span>
                  &nbsp; {item.donor_name}
                </div>
                <span className="distance">{new Date(item.donated_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {item.units_donated} {t(item.units_donated === 1 ? "bag" : "bags")} {t("donated · Phone:")} {item.donor_phone}
                {item.patient_name ? ` · ${t("Patient")}: ${item.patient_name}` : ""} · {t("Request status:")} {t(item.request_status)}
              </div>
            </div>
          ))}
        </div>
      )}


      {tab === "stats" && stats && (
        <div className="card">
          <h2>{t("Stats")}</h2>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-value">{stats.total_requests}</div><div className="stat-label">{t("Total requests")}</div></div>
            <div className="stat-card"><div className="stat-value">{stats.open_requests}</div><div className="stat-label">{t("Open requests")}</div></div>
            <div className="stat-card"><div className="stat-value">{stats.fulfilled_requests}</div><div className="stat-label">{t("Fulfilled requests")}</div></div>
            <div className="stat-card"><div className="stat-value">{stats.total_units_received}</div><div className="stat-label">{t("Bags received")}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
