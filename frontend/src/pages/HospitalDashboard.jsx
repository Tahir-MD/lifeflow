import React, { useEffect, useState } from "react";
import GroupedTabs from "../components/GroupedTabs.jsx";
import AIToolsPanel from "../components/AIToolsPanel.jsx";
import TwoFactorSettings from "../components/TwoFactorSettings.jsx";
import VoiceRecorderButton from "../components/VoiceRecorderButton.jsx";
import ForecastPanel from "../components/ForecastPanel.jsx";
import {
  createHospitalRequest,
  getMatches,
  getMyHospitalProfile,
  getHospitalDonationHistory,
  getHospitalRequestHistory,
  getHospitalStats,
  getMyInventory,
  updateMyInventory,
  listMyCamps,
  createCamp,
  listCampRsvps,
  createStaff,
  getStaffRoles,
  resetStaffPassword,
  listMyStaff,
  removeStaff,
  getHospitalAllVisitors,
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
import SosButton from "../components/SosButton.jsx";
import { TrackToggle } from "../components/RequestTimeline.jsx";
import VoiceAssistantCard from "../components/VoiceAssistantCard.jsx";
import SlipScanner from "../components/SlipScanner.jsx";
import RequestInsights from "../components/RequestInsights.jsx";
import CampForecast from "../components/CampForecast.jsx";
import ExpiryPanel from "../components/ExpiryPanel.jsx";
import TransferPanel from "../components/TransferPanel.jsx";
import BulkMessagePanel from "../components/BulkMessagePanel.jsx";
import StockRequestsPanel from "../components/StockRequestsPanel.jsx";
import ShiftChangesPanel from "../components/ShiftChangesPanel.jsx";
import PendingDonationsPanel from "../components/PendingDonationsPanel.jsx";
import TeamPanel from "../components/TeamPanel.jsx";
import LabTestsPanel from "../components/LabTestsPanel.jsx";
import { DEFAULT_SHIFT_TIMES } from "../shiftUtils";
import ExportButtons from "../components/ExportButtons.jsx";
import CampCheckIn from "../components/CampCheckIn.jsx";
import DirectoryManager from "../components/DirectoryManager.jsx";
import {
  nameError, emailError, passwordError, phoneError, numberError, locationErrors, hasErrors, serverMessage,
} from "../utils/validators.js";
import RequestProgress from "../components/RequestProgress.jsx";
import { describeUrgency } from "../utils/format.js";
import { useToast } from "../components/ToastContext.jsx";
import ContactButtons from "../components/ContactButtons.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

const SHIFT_CHOICES = ["Shift 1", "Shift 2", "Shift 3", "Shift 4"];
const ROLE_CHOICES = [
  ["receptionist", "Receptionist"],
  ["lab_technician", "Lab Assistant"],
  ["manager", "Manager"],
  ["doctor", "Doctor"],
  ["nurse", "Nurse"],
  ["blood_bank_technician", "Blood Bank Technician"],
  ["phlebotomist", "Phlebotomist"],
  ["pharmacist", "Pharmacist"],
];

const GROUPS = [
  { key: "requests", label: "Requests", icon: "list", items: [
    { key: "new", label: "New request" }, { key: "myrequests", label: "My requests" },
    { key: "stockreq", label: "Stock requests" }, { key: "confirm", label: "Confirm donations" },
    { key: "history", label: "Donations received" } ] },
  { key: "stock", label: "Blood stock", icon: "database", items: [
    { key: "inventory", label: "Stock & expiry" }, { key: "transfers", label: "Hospital transfers" } ] },
  { key: "team", label: "Team", icon: "users", items: [
    { key: "staff", label: "Staff & attendance" }, { key: "lab", label: "Lab tests" } ] },
  { key: "community", label: "Community", icon: "calendar", items: [
    { key: "camps", label: "Donation camps" }, { key: "bulk", label: "Message donors" },
    { key: "directory", label: "Ambulance & contacts" } ] },
  { key: "insights", label: "Insights", icon: "chart", items: [
    { key: "stats", label: "Stats" }, { key: "ai", label: "AI tools" } ] },
];

export default function HospitalDashboard() {
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
  const [aiIntakeText, setAiIntakeText] = useState("");
  const [aiIntakeNote, setAiIntakeNote] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [myRating, setMyRating] = useState(null);

  const [history, setHistory] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [camps, setCamps] = useState([]);
  const [campRsvps, setCampRsvps] = useState({});
  const [staffList, setStaffList] = useState([]);
  const [allVisitors, setAllVisitors] = useState([]);
  const [staffForm, setStaffForm] = useState({ full_name: "", email: "", password: "", shift: SHIFT_CHOICES[0], shift_start: DEFAULT_SHIFT_TIMES[SHIFT_CHOICES[0]][0], shift_end: DEFAULT_SHIFT_TIMES[SHIFT_CHOICES[0]][1], role: "receptionist", phone_number: "" });
  const [roleInfo, setRoleInfo] = useState({ missing: [] });
  const [stockCount, setStockCount] = useState(0);
  const [staffMessage, setStaffMessage] = useState("");
  const [staffSubmitted, setStaffSubmitted] = useState(false);
  const [campSubmitted, setCampSubmitted] = useState(false);
  const [campLocation, setCampLocation] = useState({ ...EMPTY_LOCATION });
  const [campError, setCampError] = useState("");
  const [campForm, setCampForm] = useState({
    title: "", description: "", location_label: "", latitude: "", longitude: "", camp_date: "",
  });

  async function loadProfile() {
    try {
      const response = await getMyHospitalProfile();
      setProfile(response.data);
      getRequesterRatings("hospital", response.data.id).then((r) => setMyRating(r.data)).catch(() => setMyRating(null));
    } catch (error) {
      setProfile(null);
    }
  }
  async function loadHistory() {
    try {
      const response = await getHospitalDonationHistory();
      setHistory(response.data);
    } catch (error) {
      setHistory([]);
    }
  }
  async function loadMyRequests() {
    try {
      const response = await getHospitalRequestHistory();
      setMyRequests(response.data);
    } catch (error) {
      setMyRequests([]);
    }
  }
  async function loadStats() {
    try {
      const response = await getHospitalStats();
      setStats(response.data);
    } catch (error) {
      setStats(null);
    }
  }
  async function loadInventory() {
    try {
      const response = await getMyInventory();
      setInventory(response.data);
    } catch (error) {
      setInventory([]);
    }
  }
  async function loadCamps() {
    try {
      const response = await listMyCamps();
      setCamps(response.data);
    } catch (error) {
      setCamps([]);
    }
  }
  async function loadStaff() {
    try {
      const response = await listMyStaff();
      setStaffList(response.data);
    } catch (error) {
      setStaffList([]);
    }
  }
  async function loadRoles() {
    try { setRoleInfo((await getStaffRoles()).data); } catch (error) { setRoleInfo({ missing: [] }); }
  }
  async function handleResetStaffPassword(member) {
    const pw = window.prompt(t("New password for {name} (8+ letters, capital, small and a special sign)", { name: member.full_name }));
    if (!pw) return;
    try { await resetStaffPassword(member.id, pw); setStaffMessage(t("The staff password was changed. Tell the staff member the new password.")); }
    catch (error) { setStaffMessage(serverMessage(error, "Could not change the password.")); }
  }
  async function loadAllVisitors() {
    try {
      const response = await getHospitalAllVisitors();
      setAllVisitors(response.data);
    } catch (error) {
      setAllVisitors([]);
    }
  }

  useEffect(() => {
    loadProfile();
    loadHistory();
    loadMyRequests();
    loadStats();
    loadInventory();
    loadCamps();
    loadStaff();
    loadAllVisitors();
    loadRoles();
  }, []);

  function handleStaffFormChange(event) {
    const { name, value } = event.target;
    if (name === "shift" && DEFAULT_SHIFT_TIMES[value]) {
      setStaffForm({ ...staffForm, shift: value, shift_start: DEFAULT_SHIFT_TIMES[value][0], shift_end: DEFAULT_SHIFT_TIMES[value][1] });
      return;
    }
    setStaffForm({ ...staffForm, [name]: value });
  }

  async function handleCreateStaff(event) {
    event.preventDefault();
    setStaffMessage("");
    setStaffSubmitted(true);
    if (hasErrors(staffErrors)) return;
    try {
      await createStaff({ ...staffForm, full_name: staffForm.full_name.trim(), email: staffForm.email.trim(), phone_number: staffForm.phone_number || null });
      setStaffForm({ full_name: "", email: "", password: "", shift: SHIFT_CHOICES[0], shift_start: DEFAULT_SHIFT_TIMES[SHIFT_CHOICES[0]][0], shift_end: DEFAULT_SHIFT_TIMES[SHIFT_CHOICES[0]][1], role: "receptionist", phone_number: "" });
      setStaffSubmitted(false);
      loadStaff();
      loadRoles();
    } catch (error) {
      setStaffMessage(serverMessage(error, "Could not create this staff login. The email may already be used."));
    }
  }

  async function handleRemoveStaff(staffId) {
    try {
      await removeStaff(staffId);
      loadStaff();
      loadAllVisitors();
    } catch (error) {
      // The list simply stays as it was if the removal fails.
    }
  }

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
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
      const response = await createHospitalRequest({
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
    } catch (error) {
      setErrorMessage(serverMessage(error, "Could not create the request. Please check your details and login status."));
    }
  }

  async function handleInventoryChange(blood_type, field, value) {
    setInventory(inventory.map((row) => (row.blood_type === blood_type ? { ...row, [field]: value } : row)));
  }

  async function handleInventorySave(row) {
    try {
      await updateMyInventory({
        blood_type: row.blood_type,
        units_available: parseInt(row.units_available, 10) || 0,
        low_stock_threshold: parseInt(row.low_stock_threshold, 10) || 0,
      });
      loadInventory();
      loadStats();
    } catch (error) {
      // The row simply keeps its last saved value if the update fails.
    }
  }

  function handleCampFormChange(event) {
    setCampForm({ ...campForm, [event.target.name]: event.target.value });
  }

  async function handleCreateCamp(event) {
    event.preventDefault();
    setCampError("");
    setCampSubmitted(true);
    const campDate = new Date(campForm.camp_date);
    if (campForm.title.trim().length < 3 || !campForm.camp_date || campDate < new Date() ||
        hasErrors({ a: campLocErrors.city, b: campLocErrors.area })) {
      setCampError(!campForm.camp_date || campDate < new Date() ? "Please choose a date and time in the future." : "Some answers need to be fixed. Please look at the red messages.");
      return;
    }
    try {
      const campPosition = await resolvePlace(campLocation);
      await createCamp({
        title: campForm.title.trim(),
        description: campForm.description,
        location_label: [campLocation.village, campLocation.area, campLocation.city].filter(Boolean).join(", "),
        latitude: campPosition.latitude,
        longitude: campPosition.longitude,
        camp_date: campDate.toISOString(),
      });
      setCampForm({ title: "", description: "", location_label: "", latitude: "", longitude: "", camp_date: "" });
      setCampLocation({ ...EMPTY_LOCATION });
      setCampSubmitted(false);
      loadCamps();
    } catch (error) {
      setCampError(serverMessage(error, "Could not publish the camp. Please try again."));
    }
  }

  async function toggleCampRsvps(campId) {
    if (campRsvps[campId]) {
      const updated = { ...campRsvps };
      delete updated[campId];
      setCampRsvps(updated);
      return;
    }
    try {
      const response = await listCampRsvps(campId);
      setCampRsvps({ ...campRsvps, [campId]: response.data });
    } catch (error) {
      // Leave the panel closed if the fetch fails.
    }
  }

  const staffErrors = {
    full_name: nameError(staffForm.full_name),
    email: emailError(staffForm.email),
    password: passwordError(staffForm.password),
    phone_number: phoneError(staffForm.phone_number, false),
  };
  const campLocErrors = locationErrors(campLocation);
  const reqErrors = {
    units_needed: numberError(form.units_needed, { min: 1, max: 20 }),
    patient_name: nameError(form.patient_name, false),
    patient_age: form.patient_age === "" ? "" : numberError(form.patient_age, { min: 0, max: 120 }),
    urgency_value: form.urgency_type === "emergency" ? "" : numberError(form.urgency_value, { min: 1, max: form.urgency_type === "days" ? 365 : 24 }),
    place: reqLocation.other ? (hasErrors({ a: locationErrors(reqLocation).city, b: locationErrors(reqLocation).area, c: locationErrors(reqLocation).map }) ? "x" : "") : "",
  };

  return (
    <div className="page">
      {profile && !profile.is_verified && (
        <p className="error-text" role="status">{t("Your hospital is waiting for the admin to verify it. You can use the app after it is verified.")}</p>
      )}
      {profile && (
        <div className="profile-bar">
          <div>
            <span className="role-tag">{t("Hospital")}</span>
            <span className="name">{profile.name}</span>
            {profile.is_verified ? (
              <span className="source-tag" style={{ marginLeft: "10px" }}>{t("Verified")}</span>
            ) : (
              <span className="empty-state" style={{ marginLeft: "10px" }}>{t("Pending verification")}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {myRating && myRating.average_stars && (
              <span className="avg-rating-chip">★ {myRating.average_stars} ({myRating.total_ratings})</span>
            )}
            <span>{profile.phone_number}</span>
          </div>
        </div>
      )}

      <SosButton />

      <GroupedTabs groups={GROUPS} tab={tab} onSelect={setTab} badges={{ stockreq: stockCount }} />

      {/* Stock requests are always mounted so the waiting count in the tab name stays fresh. */}
      <div style={{ display: tab === "stockreq" ? "block" : "none" }}>
        <StockRequestsPanel onCount={setStockCount} onChanged={() => { loadInventory(); loadMyRequests(); }} />
      </div>
      {tab === "confirm" && <PendingDonationsPanel />}
      {tab === "lab" && <LabTestsPanel />}

      {tab === "new" && (
        <>
          <div className="card">
            <h2>{t("Create an emergency blood request")}</h2>
            <p className="subtitle">{t("Donors are ranked by compatibility, distance, and eligibility.")}</p>
            {errorMessage && <p className="error-text" role="alert">{t(errorMessage)}</p>}

            <div className="ai-intake-box">
              <label>{t("Describe the need in your own words (any language) — AI will fill the form below")}</label>
              <textarea
                rows={2} placeholder={t("e.g. Need 2 bags of O negative urgently for a surgery patient, 45 years old")}
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
                &nbsp; {lastRequestResult.inventory_units_used} {t("bag(s) of")} {lastRequestResult.blood_type_needed} {t("were already available")}{lastRequestResult.fulfilling_hospital_name ? ` (${lastRequestResult.fulfilling_hospital_name})` : ""} {t("and have been reserved for this request automatically.")}
              </p>
              {lastRequestResult.units_remaining > 0 && (
                <p className="empty-state">{lastRequestResult.units_remaining} {t("bag(s) are still short — donors have been notified below.")}</p>
              )}
              {lastRequestResult.units_remaining === 0 && (
                <p className="empty-state">{t("The full request is covered from existing stock. No donor call-out was needed.")}</p>
              )}
            </div>
          )}

          {searched && (
            <div className="card">
              <h2>{t("Matching donors")}</h2>
              <p className="subtitle">{t("Closest and most recently eligible donors appear first, with contact number.")}</p>

              {matches.length === 0 && (
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
          <PrintHeader title="My requests — full history" subtitle={profile ? profile.name : ""} />
          <div className="list-row-top">
            <h2>{t("My requests — full history")}</h2>
            <PrintButton />
          </div>
          <ExportButtons role="hospital" />
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
                {t("Status:")} {t(r.status)} · {describeUrgency(r, t)}
                {r.patient_name ? ` · ${t("Patient")}: ${r.patient_name}` : ""}
              </div>
              <RequestProgress request={r} />
              <TrackToggle requestId={r.id} />
              <RequestInsights requestId={r.id} />
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="card">
          <PrintHeader title="Requests received" subtitle={profile ? profile.name : ""} />
          <div className="list-row-top">
            <h2>{t("Requests received")}</h2>
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

      {tab === "staff" && <TeamPanel hospitalName={profile ? profile.name : ""} />}

      {tab === "staff" && (
        <>
          <div className="card">
            <h2>{t("Add a staff login")}</h2>
            {roleInfo.missing && roleInfo.missing.length > 0 && (
              <p className="error-text">{t("Every hospital needs: Receptionist, Lab Assistant, Manager and Doctor. Still missing")}: {roleInfo.missing.map((m) => t(m.label)).join(", ")}.</p>
            )}
            <p className="subtitle">{t("Create a login for whoever is coming on duty. Give them the email and password you set here.")}</p>
            {staffMessage && <p className="error-text" role="alert">{t(staffMessage)}</p>}
            <form onSubmit={handleCreateStaff} noValidate>
              <TextField kind="name" label="Full name" name="full_name" value={staffForm.full_name} onChange={handleStaffFormChange} error={staffErrors.full_name} submitted={staffSubmitted} placeholder="Full name" />
              <TextField kind="email" label="Login email" name="email" value={staffForm.email} onChange={handleStaffFormChange} error={staffErrors.email} submitted={staffSubmitted} placeholder="Email" />
              <PasswordField label="Login password" name="password" placeholder="Password" value={staffForm.password} onChange={handleStaffFormChange} error={staffErrors.password} submitted={staffSubmitted} />
              <label>{t("Shift")}</label>
              <select name="shift" value={staffForm.shift} onChange={handleStaffFormChange}>
                {SHIFT_CHOICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <label>{t("Duty from (start time)")}</label>
              <input name="shift_start" type="time" value={staffForm.shift_start} onChange={handleStaffFormChange} required />
              <label>{t("Duty to (end time)")}</label>
              <input name="shift_end" type="time" value={staffForm.shift_end} onChange={handleStaffFormChange} required />
              <label htmlFor="staff-role">{t("Staff role")}</label>
              <select id="staff-role" name="role" value={staffForm.role} onChange={handleStaffFormChange}>
                {ROLE_CHOICES.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              </select>
              <p className="field-hint">{t("Receptionist: logs visitors and checks donors in. Lab technician: also manages blood stock. Doctor: also screens donors. Manager: everything.")}</p>
              <PhoneField label="Phone number, optional" value={staffForm.phone_number} onChange={handleStaffFormChange} error={staffErrors.phone_number} submitted={staffSubmitted} required={false} />
              <button type="submit">{t("Create staff login")}</button>
            </form>
          </div>

          <ShiftChangesPanel onDecided={loadStaff} />

          <div className="card">
            <h2>{t("Your staff, by shift")}</h2>
            {staffList.length === 0 && <p className="empty-state">{t("No staff logins yet.")}</p>}
            {staffList.map((s) => (
              <div className="list-row-stack" key={s.id}>
                <div className="list-row-top">
                  <div className="meta">
                    <span className="badge">{s.shift_label || s.shift}</span>
                    &nbsp; <span className="badge">{t((ROLE_CHOICES.find((r) => r[0] === s.role) || ROLE_CHOICES[0])[1])}</span>
                    &nbsp; {s.full_name} &nbsp;
                    <span className="empty-state" style={{ display: "inline" }}>{s.email}</span>
                  </div>
                  <span>
                    <button className="inline-btn btn-outline" onClick={() => handleResetStaffPassword(s)}>{t("Reset password")}</button>
                    &nbsp;
                    <button className="inline-btn btn-outline" onClick={() => handleRemoveStaff(s.id)}>{t("Remove")}</button>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <PrintHeader title="Combined staff shift record" subtitle={profile ? profile.name : ""} />
            <div className="list-row-top">
              <h2>{t("Combined record — every staff member, every shift")}</h2>
              <PrintButton />
            </div>
            <p className="subtitle no-print">{t("Every donor and patient logged by any staff member, with who logged it and on which shift.")}</p>
            {allVisitors.length === 0 && <p className="empty-state">{t("No visits logged yet.")}</p>}
            {allVisitors.map((v) => (
              <div className="list-row-stack" key={v.id}>
                <div className="list-row-top">
                  <div className="meta">
                    <span className={v.visitor_type === "donor" ? "tag-hospital" : "tag-receiver"}>
                      {t(v.visitor_type === "donor" ? "Donor" : "Patient")}
                    </span>
                    &nbsp; {v.full_name} {v.blood_type ? `· ${v.blood_type}` : ""}
                  </div>
                  <span className="distance">{new Date(v.logged_at).toLocaleString()}</span>
                </div>
                <div className="empty-state">
                  {t("Logged by")} {v.staff_name} ({v.staff_shift})
                  {v.from_location ? ` · ${t("From")}: ${v.from_location}` : ""}
                  {v.phone_number ? ` · ${t("Phone")}: ${v.phone_number}` : ""}
                  {v.notes ? ` · ${v.notes}` : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "ai" && (
        <>
          <AIToolsPanel />
          <TwoFactorSettings role="hospital" />
        </>
      )}

      {tab === "inventory" && (
        <div className="card">
          <h2>{t("Blood bank inventory")}</h2>
          <p className="subtitle">{t("Keep your on-hand stock current so patients and donors can see it.")}</p>
          <table className="simple-table">
            <thead>
              <tr>
                <th>{t("Blood type")}</th>
                <th>{t("Units available")}</th>
                <th>{t("Low stock alert below")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((row) => (
                <tr key={row.blood_type}>
                  <td><span className="badge">{row.blood_type}</span></td>
                  <td>
                    <input
                      type="number" min="0" value={row.units_available}
                      onChange={(e) => handleInventoryChange(row.blood_type, "units_available", e.target.value)}
                    />
                    {row.is_low && <div className="low-stock">{t("Low stock")}</div>}
                  </td>
                  <td>
                    <input
                      type="number" min="0" value={row.low_stock_threshold}
                      onChange={(e) => handleInventoryChange(row.blood_type, "low_stock_threshold", e.target.value)}
                    />
                  </td>
                  <td><button className="inline-btn" onClick={() => handleInventorySave(row)}>{t("Save")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "camps" && (
        <>
          <div className="card">
            <h2>{t("Organize a donation camp")}</h2>
            <p className="subtitle">{t("Every donor on LifeFlow is notified when you publish one.")}</p>
            {campError && <p className="error-text" role="alert">{t(campError)}</p>}
            <form onSubmit={handleCreateCamp} noValidate>
              <TextField label="Title" name="title" value={campForm.title} onChange={handleCampFormChange} error={campForm.title.trim().length < 3 ? "Title must be at least 3 characters." : ""} submitted={campSubmitted} placeholder="Example: Free blood donation camp" maxLength={100} />
              <TextField label="Description, optional" name="description" value={campForm.description} onChange={handleCampFormChange} required={false} maxLength={250} />
              <LocationPicker value={campLocation} onChange={setCampLocation} errors={campLocErrors} submitted={campSubmitted} title="Where will the camp be?" />
              <label>{t("Date and time")}</label>
              <input type="datetime-local" name="camp_date" value={campForm.camp_date} onChange={handleCampFormChange} required />
              <button type="submit">{t("Publish camp")}</button>
            </form>
          </div>

          <CampCheckIn />

          <div className="card">
            <h2>{t("Your camps")}</h2>
            {camps.length === 0 && <p className="empty-state">{t("You have not organized a camp yet.")}</p>}
            {camps.map((camp) => (
              <div className="list-row-stack" key={camp.id}>
                <div className="list-row-top">
                  <div className="meta"><strong>{camp.title}</strong></div>
                  <span className="distance">{new Date(camp.camp_date).toLocaleString()}</span>
                </div>
                <div className="empty-state">{camp.location_label} · {camp.registered_count} {t(camp.registered_count === 1 ? "donor" : "donors")} {t("registered")}</div>
                <CampForecast campId={camp.id} />
                <button className="inline-btn btn-outline" onClick={() => toggleCampRsvps(camp.id)}>
                  {campRsvps[camp.id] ? "Hide registered donors" : "View registered donors"}
                </button>
                {campRsvps[camp.id] && (
                  <table className="simple-table" style={{ marginTop: "10px" }}>
                    <thead><tr><th>{t("Donor")}</th><th>{t("Blood type")}</th><th>{t("Phone")}</th></tr></thead>
                    <tbody>
                      {campRsvps[camp.id].map((r) => (
                        <tr key={r.id}><td>{r.donor_name}</td><td>{r.donor_blood_type}</td><td>{r.donor_phone}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "inventory" && <ExpiryPanel />}

      {tab === "transfers" && <TransferPanel />}

      {tab === "bulk" && <BulkMessagePanel />}

      {tab === "directory" && <DirectoryManager role="hospital" />}

      {tab === "stats" && stats && (
        <div className="card">
          <h2>{t("Stats")}</h2>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-value">{stats.total_requests}</div><div className="stat-label">{t("Total requests")}</div></div>
            <div className="stat-card"><div className="stat-value">{stats.open_requests}</div><div className="stat-label">{t("Open requests")}</div></div>
            <div className="stat-card"><div className="stat-value">{stats.fulfilled_requests}</div><div className="stat-label">{t("Fulfilled requests")}</div></div>
            <div className="stat-card"><div className="stat-value">{stats.total_units_received}</div><div className="stat-label">{t("Bags received")}</div></div>
          </div>
          {stats.low_stock_types.length > 0 && (
            <p className="error-text">{t("Low stock:")} {stats.low_stock_types.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
