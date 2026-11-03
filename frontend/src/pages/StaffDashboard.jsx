import React, { useEffect, useState } from "react";
import TabIcon from "../components/TabIcon.jsx";
import { DataAssistantCard } from "../components/AIToolsPanel.jsx";
import {
  getMyStaffProfile,
  logVisitor,
  getMyVisitorEntries,
} from "../services/api";
import PrintButton from "../components/PrintButton.jsx";
import TextField from "../components/form/TextField.jsx";
import PhoneField from "../components/form/PhoneField.jsx";
import FormField from "../components/form/FormField.jsx";
import ExpiryPanel from "../components/ExpiryPanel.jsx";
import ScreeningPanel from "../components/ScreeningPanel.jsx";
import CampCheckIn from "../components/CampCheckIn.jsx";
import AttendancePanel from "../components/AttendancePanel.jsx";
import MyShiftPanel from "../components/MyShiftPanel.jsx";
import LabTestsPanel from "../components/LabTestsPanel.jsx";
import StockViewPanel from "../components/StockViewPanel.jsx";
import PendingDonationsPanel from "../components/PendingDonationsPanel.jsx";
import TeamPanel from "../components/TeamPanel.jsx";
import { nameError, phoneError, serverMessage } from "../utils/validators.js";
import PrintHeader from "../components/PrintHeader.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const ALL_TABS = [
  { key: "duty", label: "My duty", needs: null },
  { key: "confirm", label: "Confirm donations", needs: "confirm_donations" },
  { key: "lab", label: "Lab tests", needs: "lab_tests" },
  { key: "stock", label: "Blood stock", needs: ["view_stock", "manage_stock"] },
  { key: "team", label: "Team & attendance", needs: "view_all" },
  { key: "visitors", label: "Visitors", needs: "log_visitors" },
  { key: "checkin", label: "Camp check-in", needs: "camp_checkin" },
  { key: "screening", label: "Donor medical screening", needs: "screen_donors" },
];

const ROLE_NAMES = {
  receptionist: "Receptionist", lab_technician: "Lab Assistant", doctor: "Doctor", manager: "Manager", nurse: "Nurse",
  blood_bank_technician: "Blood Bank Technician", phlebotomist: "Phlebotomist", pharmacist: "Pharmacist",
};

export default function StaffDashboard() {
  const { t } = useI18n();
  const [tab, setTab] = useState("duty");
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    visitor_type: "donor",
    full_name: "",
    blood_type: "",
    phone_number: "",
    from_location: "",
    notes: "",
  });

  async function loadProfile() {
    try {
      const response = await getMyStaffProfile();
      setProfile(response.data);
    } catch (error) {
      setProfile(null);
    }
  }

  async function loadEntries() {
    try {
      const response = await getMyVisitorEntries();
      setEntries(response.data);
    } catch (error) {
      setEntries([]);
    }
  }

  useEffect(() => {
    loadProfile();
    loadEntries();
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setSubmitted(true);
    if (visitErrors.full_name || visitErrors.phone_number) return;
    try {
      await logVisitor({ ...form, full_name: form.full_name.trim(), phone_number: form.phone_number || null, blood_type: form.blood_type || null });
      setSubmitted(false);
      setForm({ visitor_type: form.visitor_type, full_name: "", blood_type: "", phone_number: "", from_location: "", notes: "" });
      setMessage("Saved to your shift record.");
      loadEntries();
    } catch (error) {
      setMessage(serverMessage(error, "Could not save this entry. Please try again."));
    }
  }

  const visitErrors = { full_name: nameError(form.full_name), phone_number: phoneError(form.phone_number, false) };
  const donorCount = entries.filter((e) => e.visitor_type === "donor").length;
  const patientCount = entries.filter((e) => e.visitor_type === "patient").length;

  return (
    <div className="page">
      {profile && (
        <div className="profile-bar">
          <div>
            <span className="role-tag">{t("Staff")}</span>
            <span className="name">{profile.full_name}</span>
            &nbsp; ({profile.shift_label || profile.shift}) · <span className="badge">{t(ROLE_NAMES[profile.role] || "Receptionist")}</span>
          </div>
          <div>{donorCount} {t("donors")} · {patientCount} {t("patients this record")}</div>
        </div>
      )}

      <div className="tab-row">
        {(profile ? ALL_TABS.filter((tb) => !tb.needs || [].concat(tb.needs).some((n) => (profile.permissions || []).includes(n))) : ALL_TABS.slice(0, 1)).map((tb) => (
          <button key={tb.key} className={`tab-button ${tab === tb.key ? "active" : ""}`} onClick={() => setTab(tb.key)}>
            <TabIcon name={tb.key} /> {t(tb.label)}
          </button>
        ))}
      </div>

      {tab === "duty" && <AttendancePanel />}
      {tab === "duty" && <MyShiftPanel profile={profile} onChanged={loadProfile} />}
      {tab === "confirm" && <PendingDonationsPanel />}
      {tab === "lab" && <LabTestsPanel />}
      {tab === "stock" && (profile?.permissions || []).includes("view_stock") && <StockViewPanel />}
      {tab === "team" && <TeamPanel hospitalName="" />}

      {tab === "visitors" && (
        <div className="card">
          <h2>{t("Log a donor or patient")}</h2>
          <p className="subtitle">{t("Add anyone who comes in while you're on duty. It's saved to your own shift record right away.")}</p>
          {message && <p className="notice-text">{t(message)}</p>}
          <form onSubmit={handleSubmit} noValidate>
            <label>{t("Who came in")}</label>
            <select name="visitor_type" value={form.visitor_type} onChange={handleChange}>
              <option value="donor">{t("Donor")}</option>
              <option value="patient">{t("Patient")}</option>
            </select>

            <TextField kind="name" label="Full name" name="full_name" value={form.full_name} onChange={handleChange} error={visitErrors.full_name} submitted={submitted} placeholder="Full name" />

            <FormField label="Blood type, optional" required={false} htmlFor="f-blood_type">
              <select id="f-blood_type" name="blood_type" value={form.blood_type} onChange={handleChange}>
                <option value="">{t("Not known")}</option>
                {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </FormField>

            <PhoneField label="Phone number, optional" value={form.phone_number} onChange={handleChange} error={visitErrors.phone_number} submitted={submitted} required={false} />

            <TextField label="Where they came from, optional" name="from_location" value={form.from_location} onChange={handleChange} required={false} placeholder="e.g. Gulshan, Karachi" maxLength={120} />

            <TextField label="Notes, optional" name="notes" value={form.notes} onChange={handleChange} required={false} maxLength={200} />

            <button type="submit">{t("Save to my shift record")}</button>
          </form>
        </div>
      )}

      {tab === "visitors" && (
        <div className="card">
          <PrintHeader title="Staff shift record" subtitle={profile ? `${profile.full_name} — ${profile.shift}` : ""} />
          <div className="list-row-top">
            <h2>{t("My shift record")}</h2>
            <PrintButton />
          </div>
          <p className="subtitle no-print">
            {donorCount} {t(donorCount === 1 ? "donor" : "donors")} {t("and")} {patientCount} {t(patientCount === 1 ? "patient" : "patients")} {t("logged by you. When you go off duty, print or save this as a PDF for your records.")}
          </p>
          {entries.length === 0 && <p className="empty-state">{t("Nothing logged yet.")}</p>}
          {entries.map((entry) => (
            <div className="list-row-stack" key={entry.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className={entry.visitor_type === "donor" ? "tag-hospital" : "tag-receiver"}>
                    {t(entry.visitor_type === "donor" ? "Donor" : "Patient")}
                  </span>
                  &nbsp; {entry.full_name} {entry.blood_type ? `· ${entry.blood_type}` : ""}
                </div>
                <span className="distance">{new Date(entry.logged_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {entry.from_location ? `${t("From")}: ${entry.from_location}` : ""}
                {entry.phone_number ? ` · ${t("Phone")}: ${entry.phone_number}` : ""}
                {entry.notes ? ` · ${entry.notes}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "checkin" && <CampCheckIn />}

      {tab === "stock" && (profile?.permissions || []).includes("manage_stock") && <ExpiryPanel />}

      {tab === "screening" && <ScreeningPanel />}
      <DataAssistantCard />
    </div>
  );
}
