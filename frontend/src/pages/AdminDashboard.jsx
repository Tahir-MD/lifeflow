import React, { useEffect, useState } from "react";
import GroupedTabs from "../components/GroupedTabs.jsx";
import BackupPanel from "../components/BackupPanel.jsx";
import AdminExtrasPanel from "../components/AdminExtrasPanel.jsx";
import AdminGovernancePanel from "../components/AdminGovernancePanel.jsx";
import ReviewPanel from "../components/ReviewPanel.jsx";
import ExportButtons from "../components/ExportButtons.jsx";
import BulkMessagePanel from "../components/BulkMessagePanel.jsx";
import DirectoryManager from "../components/DirectoryManager.jsx";
import { useNavigate } from "react-router-dom";
import {
  getAllDonorsAdmin,
  getAllHospitalsAdmin,
  getAllReceiversAdmin,
  getAllRequestsAdmin,
  getAllDonationsAdmin,
  getStockGivesAdmin,
  getAllNotificationsAdmin,
  getDonorHistoryAdmin,
  getHospitalHistoryAdmin,
  getReceiverHistoryAdmin,
  getAllStaffAdmin,
  getStaffHistoryAdmin,
  getMyAdminProfile,
} from "../services/api";
import ShortageAnalytics from "../components/ShortageAnalytics.jsx";
import { adminRemoveUser } from "../services/api";
import PrintButton from "../components/PrintButton.jsx";
import PrintHeader from "../components/PrintHeader.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const GROUPS = [
  { key: "people", label: "People", icon: "users", items: [
    { key: "donors", label: "Donors" }, { key: "hospitals", label: "Hospitals" },
    { key: "receivers", label: "Patients" }, { key: "staff", label: "Hospital staff" } ] },
  { key: "records", label: "Records", icon: "list", items: [
    { key: "requests", label: "All requests" }, { key: "donations", label: "All donations" },
    { key: "notifications", label: "All messages" }, { key: "analytics", label: "Shortage analytics" } ] },
  { key: "review", label: "Review & safety", icon: "shield", items: [
    { key: "review", label: "Request review" }, { key: "extras", label: "Hospital verification & feedback" },
    { key: "governance", label: "Audit & AI" } ] },
  { key: "tools", label: "Tools", icon: "megaphone", items: [
    { key: "bulk", label: "Message donors" }, { key: "directory", label: "Emergency directory" },
    { key: "backups", label: "Backups" } ] },
];

// One short line that says who gave the bags for a request (hospital stock and/or donors).
function fulfilmentLine(r, t) {
  const fromStock = r.inventory_units_used || 0;
  const fromDonors = Math.max((r.units_fulfilled || 0) - fromStock, 0);
  const parts = [];
  if (fromStock > 0) parts.push(t("{n} bag(s) from hospital stock: {name}", { n: fromStock, name: r.fulfilling_hospital_name || "" }));
  if (fromDonors > 0) parts.push(t("{n} bag(s) from donors", { n: fromDonors }));
  return parts.join(" · ");
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState("donors");
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [stockGives, setStockGives] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [staff, setStaff] = useState([]);

  const [drilldown, setDrilldown] = useState(null); // { type, id, name, items }

  async function removeUser(role, item, name) {
    if (!window.confirm(t("Remove {name}? They will not be able to log in any more. Their past records stay.", { name }))) return;
    try {
      await adminRemoveUser(role, item.id);
      loadAll();
    } catch (err) {
      window.alert(err?.response?.data?.detail || t("Could not remove this user."));
    }
  }

  async function loadAll() {
    try {
      const [d, h, r, req, don, notif, st] = await Promise.all([
        getAllDonorsAdmin(),
        getAllHospitalsAdmin(),
        getAllReceiversAdmin(),
        getAllRequestsAdmin(),
        getAllDonationsAdmin(),
        getAllNotificationsAdmin(),
        getAllStaffAdmin(),
      ]);
      setDonors(d.data);
      setHospitals(h.data);
      setReceivers(r.data);
      setRequests(req.data);
      setDonations(don.data);
      try { setStockGives((await getStockGivesAdmin()).data); } catch (e) { setStockGives([]); }
      setNotifications(notif.data);
      setStaff(st.data);
    } catch (error) {
      // Stays empty if the admin token is missing or expired.
    }
  }

  useEffect(() => {
    // Guards against someone reaching the dashboard directly (URL bar, back
    // button) before they've replaced the default admin credentials.
    getMyAdminProfile()
      .then((response) => {
        if (response.data.must_change_password) {
          navigate("/admin/change-credentials");
        } else {
          loadAll();
        }
      })
      .catch(() => navigate("/login"));
  }, []);

  async function openDonorHistory(donor) {
    const response = await getDonorHistoryAdmin(donor.id);
    setDrilldown({ type: "donor", name: donor.full_name, items: response.data });
  }
  async function openHospitalHistory(hospital) {
    const response = await getHospitalHistoryAdmin(hospital.id);
    setDrilldown({ type: "hospital", name: hospital.name, items: response.data });
  }
  async function openReceiverHistory(receiver) {
    const response = await getReceiverHistoryAdmin(receiver.id);
    setDrilldown({ type: "receiver", name: receiver.full_name, items: response.data });
  }
  async function openStaffHistory(member) {
    const response = await getStaffHistoryAdmin(member.id);
    setDrilldown({ type: "staff", name: `${member.full_name} (${member.shift})`, items: response.data });
  }

  return (
    <div className="page">
      <div className="profile-bar">
        <div>
          <span className="role-tag">{t("Admin")}</span>
          <span className="name">{t("LifeFlow control panel")}</span>
        </div>
        <div>
          {donors.length} {t("donors")} · {hospitals.length} {t("hospitals")} · {receivers.length} {t("patients")}
        </div>
      </div>

      <ExportButtons role="admin" />

      <GroupedTabs groups={GROUPS} tab={tab} onSelect={(key) => { setTab(key); setDrilldown(null); }} />

      {drilldown && (
        <div className="card">
          <PrintHeader title={`${drilldown.name}'s full history`} subtitle="LifeFlow admin record" />
          <div className="list-row-top">
            <h2>{drilldown.name}{t("'s full history")}</h2>
            <PrintButton />
          </div>
          <button className="inline-btn btn-outline no-print" onClick={() => setDrilldown(null)} style={{ marginBottom: "12px" }}>
            {t("Close")}
          </button>
          {drilldown.items.length === 0 && <p className="empty-state">{t("No history yet.")}</p>}
          {drilldown.type === "donor"
            ? drilldown.items.map((item) => (
                <div className="list-row-stack" key={item.donation_id}>
                  <div className="list-row-top">
                    <div className="meta">
                      <span className="badge">{item.blood_type_needed}</span>
                      &nbsp; {t("gave to")} {item.requester_name}
                    </div>
                    <span className="distance">{new Date(item.donated_at).toLocaleString()}</span>
                  </div>
                  <div className="empty-state">
                    {item.units_donated} {t(item.units_donated === 1 ? "bag" : "bags")} · {t("Status:")} {t(item.request_status)}
                  </div>
                </div>
              ))
            : drilldown.type === "staff"
            ? drilldown.items.map((item) => (
                <div className="list-row-stack" key={item.id}>
                  <div className="list-row-top">
                    <div className="meta">
                      <span className={item.visitor_type === "donor" ? "tag-hospital" : "tag-receiver"}>
                        {t(item.visitor_type === "donor" ? "Donor" : "Patient")}
                      </span>
                      &nbsp; {item.full_name} {item.blood_type ? `· ${item.blood_type}` : ""}
                    </div>
                    <span className="distance">{new Date(item.logged_at).toLocaleString()}</span>
                  </div>
                  <div className="empty-state">
                    {item.from_location ? `${t("From")}: ${item.from_location}` : ""}
                    {item.phone_number ? ` · ${t("Phone")}: ${item.phone_number}` : ""}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </div>
                </div>
              ))
            : drilldown.items.map((item) => (
                <div className="list-row-stack" key={item.id}>
                  <div className="list-row-top">
                    <div className="meta">
                      <span className="badge">{item.blood_type_needed}</span>
                      &nbsp; {t("{remaining} of {needed} still needed", { remaining: item.units_remaining, needed: item.units_needed })}
                    </div>
                    <span className="distance">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <div className="empty-state">{t("Status:")} {t(item.status)}{item.patient_name ? ` · ${t("Patient")}: ${item.patient_name}` : ""}</div>
                  {fulfilmentLine(item, t) && <div className="empty-state">{fulfilmentLine(item, t)}</div>}
                </div>
              ))}
        </div>
      )}

      {!drilldown && tab === "analytics" && <ShortageAnalytics />}

      {!drilldown && tab === "review" && <ReviewPanel />}

      {!drilldown && tab === "bulk" && <BulkMessagePanel />}

      {!drilldown && tab === "directory" && <DirectoryManager role="admin" />}

      {!drilldown && tab === "governance" && <AdminGovernancePanel />}

      {!drilldown && tab === "backups" && <BackupPanel />}

      {!drilldown && tab === "extras" && <AdminExtrasPanel />}

      {!drilldown && tab === "donors" && (
        <div className="card">
          <h2>{t("Every donor")}</h2>
          <p className="subtitle">{t("Click a donor to see their full donation history.")}</p>
          {donors.map((d) => (
            <div className="list-row-stack" key={d.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{d.blood_type}</span>
                  &nbsp; {d.full_name} &nbsp;
                  <span className="empty-state" style={{ display: "inline" }}>{d.email}</span>
                </div>
                <span className="distance">{d.points} {t("points")}</span>
              </div>
              <button className="inline-btn" onClick={() => openDonorHistory(d)}>{t("View full history")}</button>
              <button className="inline-btn danger-btn" onClick={() => removeUser("donor", d, d.full_name)}>🗑 {t("Remove user")}</button>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "hospitals" && (
        <div className="card">
          <h2>{t("Every hospital")}</h2>
          <p className="subtitle">{t("Click a hospital to see their full request history.")}</p>
          {hospitals.map((h) => (
            <div className="list-row-stack" key={h.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="tag-hospital">{t("Hospital")}</span>
                  &nbsp; {h.name} &nbsp;
                  <span className="empty-state" style={{ display: "inline" }}>{h.email}</span>
                </div>
                <span className="distance">{h.phone_number}</span>
              </div>
              <button className="inline-btn" onClick={() => openHospitalHistory(h)}>{t("View full history")}</button>
              <button className="inline-btn danger-btn" onClick={() => removeUser("hospital", h, h.name)}>🗑 {t("Remove user")}</button>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "receivers" && (
        <div className="card">
          <h2>{t("Every patient")}</h2>
          <p className="subtitle">{t("Click a patient to see their full request history.")}</p>
          {receivers.map((r) => (
            <div className="list-row-stack" key={r.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="tag-receiver">{t("Patient")}</span>
                  &nbsp; {r.full_name} &nbsp;
                  <span className="empty-state" style={{ display: "inline" }}>{r.email}</span>
                </div>
                <span className="distance">{r.phone_number}</span>
              </div>
              <button className="inline-btn" onClick={() => openReceiverHistory(r)}>{t("View full history")}</button>
              <button className="inline-btn danger-btn" onClick={() => removeUser("receiver", r, r.full_name)}>🗑 {t("Remove user")}</button>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "staff" && (
        <div className="card">
          <h2>{t("Every hospital staff member, every shift")}</h2>
          <p className="subtitle">{t("Click a staff member to see their full shift record.")}</p>
          {staff.map((s) => (
            <div className="list-row-stack" key={s.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{s.staff_role}</span> <span className="badge">{s.shift_label || s.shift}</span>
                  &nbsp; {s.full_name} &nbsp;
                  <span className="empty-state" style={{ display: "inline" }}>{s.email}</span>
                </div>
                <span className="distance">{t("Hospital #")}{s.hospital_id}</span>
              </div>
              <button className="inline-btn" onClick={() => openStaffHistory(s)}>{t("View full shift record")}</button>
              <button className="inline-btn danger-btn" onClick={() => removeUser("staff", s, s.full_name)}>🗑 {t("Remove user")}</button>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "requests" && (
        <div className="card">
          <PrintHeader title="Every request ever made" subtitle="LifeFlow admin record" />
          <div className="list-row-top">
            <h2>{t("Every request ever made, any status")}</h2>
            <PrintButton />
          </div>
          {requests.map((r) => (
            <div className="list-row-stack" key={r.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className={r.requester_type === "hospital" ? "tag-hospital" : "tag-receiver"}>
                    {r.requester_type === "hospital" ? "Hospital" : "Patient"}
                  </span>
                  &nbsp; <span className="badge">{r.blood_type_needed}</span>
                  &nbsp; {r.requester_name}
                </div>
                <span className="distance">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {t("Status:")} {t(r.status)} · {r.units_fulfilled}/{r.units_needed} {t("bags fulfilled")}
                {r.patient_name ? ` · ${t("Patient")}: ${r.patient_name}` : ""}
              </div>
              {fulfilmentLine(r, t) && <div className="empty-state">{fulfilmentLine(r, t)}</div>}
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "donations" && (
        <div className="card">
          <PrintHeader title="Every completed donation" subtitle="LifeFlow admin record" />
          <div className="list-row-top">
            <h2>{t("Every completed donation")}</h2>
            <PrintButton />
          </div>
          {donations.map((item) => (
            <div className="list-row-stack" key={item.donation_id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{item.donor_blood_type}</span>
                  &nbsp; {item.donor_name} → {item.requester_name}
                </div>
                <span className="distance">{new Date(item.donated_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">
                {item.units_donated} {t(item.units_donated === 1 ? "bag" : "bags")} · {t("Request status:")} {t(item.request_status)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "donations" && (
        <div className="card">
          <div className="list-row-top">
            <h2>{t("Bags given from hospital stock")}</h2>
          </div>
          {stockGives.length === 0 && <p className="empty-state">{t("No hospital has given stock yet.")}</p>}
          {stockGives.map((g) => (
            <div className="list-row-stack" key={g.id}>
              <div className="list-row-top">
                <div className="meta">
                  <span className="badge">{g.blood_type}</span>
                  &nbsp; {g.hospital_name} → {g.requester_name}{g.patient_name ? ` (${g.patient_name})` : ""}
                </div>
                <span className="distance">{g.given_at ? new Date(g.given_at).toLocaleString() : ""}</span>
              </div>
              <div className="empty-state">
                {g.units_given} {t(g.units_given === 1 ? "bag" : "bags")} · {t("Request status:")} {t(g.request_status || "")}
              </div>
            </div>
          ))}
        </div>
      )}

      {!drilldown && tab === "notifications" && (
        <div className="card">
          <PrintHeader title="Every message / request notification" subtitle="LifeFlow admin record" />
          <div className="list-row-top">
            <h2>{t("Every message / request notification sent, full history")}</h2>
            <PrintButton />
          </div>
          {notifications.map((n) => (
            <div className="list-row-stack" key={n.id}>
              <div className="list-row-top">
                <div className="meta">{n.title}</div>
                <span className="distance">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <div className="empty-state">{n.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
