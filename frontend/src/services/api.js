import axios from "axios";

import { API_BASE_URL } from "../platform.js";

const BASE_URL = API_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lifeflow_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function registerDonor(data) {
  return api.post("/auth/register/donor", data);
}

export function registerHospital(data) {
  return api.post("/auth/register/hospital", data);
}

export function registerReceiver(data) {
  return api.post("/auth/register/receiver", data);
}

export function loginDonor(email, password) {
  return api.post("/auth/login/donor", { email, password });
}

export function loginHospital(email, password) {
  return api.post("/auth/login/hospital", { email, password });
}

export function loginReceiver(email, password) {
  return api.post("/auth/login/receiver", { email, password });
}

export function loginAdmin(email, password) {
  return api.post("/auth/login/admin", { email, password });
}
export function getMyAdminProfile() {
  return api.get("/admin/me");
}
export function changeAdminCredentials(currentPassword, newEmail, newFullName, newPassword) {
  return api.post("/admin/change-credentials", {
    current_password: currentPassword,
    new_email: newEmail,
    new_full_name: newFullName || null,
    new_password: newPassword,
  });
}

export function loginStaff(email, password) {
  return api.post("/auth/login/staff", { email, password });
}

export function getMyDonorProfile() {
  return api.get("/donors/me");
}

export function getMyHospitalProfile() {
  return api.get("/hospitals/me");
}

export function getMyReceiverProfile() {
  return api.get("/receivers/me");
}

export function createHospitalRequest(data) {
  return api.post("/requests/hospital", data);
}

export function createReceiverRequest(data) {
  return api.post("/requests/receiver", data);
}

export function listBloodRequests() {
  return api.get("/requests");
}

export function getHospitalRequestHistory() {
  return api.get("/requests/hospital/history");
}

export function getReceiverRequestHistory() {
  return api.get("/requests/receiver/history");
}

export function getMatches(requestId) {
  return api.get(`/matching/${requestId}`);
}

export function acceptRequest(requestId, unitsDonated = 1) {
  return api.post(`/matching/${requestId}/accept`, { units_donated: unitsDonated });
}

export function logout() {
  localStorage.removeItem("lifeflow_token");
  // Saved API answers belong to the person who just signed out -- drop them.
  try { navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_API_CACHE" }); } catch (e) { /* ignore */ }
  localStorage.removeItem("lifeflow_role");
}

// ---- Donation history (full details of the other side, for every role) ----
export function getDonorDonationHistory() {
  return api.get("/donations/donor/history");
}
export function getHospitalDonationHistory() {
  return api.get("/donations/hospital/history");
}
export function getReceiverDonationHistory() {
  return api.get("/donations/receiver/history");
}

// ---- Notifications ----
export function getDonorNotifications() {
  return api.get("/notifications/donor");
}
export function getHospitalNotifications() {
  return api.get("/notifications/hospital");
}
export function getReceiverNotifications() {
  return api.get("/notifications/receiver");
}
export function markAllNotificationsRead(role) {
  return api.post(`/notifications/${role}/read-all`);
}

// ---- Ratings ----
export function rateDonor(donationId, stars, comment) {
  return api.post(`/ratings/${donationId}/rate-donor`, { stars, comment });
}
export function rateRequester(donationId, stars, comment) {
  return api.post(`/ratings/${donationId}/rate-requester`, { stars, comment });
}
export function getDonorRatings(donorId) {
  return api.get(`/ratings/donor/${donorId}`);
}
export function getRequesterRatings(role, requesterId) {
  return api.get(`/ratings/requester/${role}/${requesterId}`);
}

// ---- Blood inventory (hospital blood bank stock) ----
export function getMyInventory() {
  return api.get("/inventory/me");
}
export function updateMyInventory(item) {
  return api.put("/inventory/me", item);
}
export function getAllHospitalInventories() {
  return api.get("/inventory");
}

// ---- Donation camps / drives ----
export function createCamp(data) {
  return api.post("/camps", data);
}
export function listUpcomingCamps() {
  return api.get("/camps");
}
export function listMyCamps() {
  return api.get("/camps/mine");
}
export function listCampRsvps(campId) {
  return api.get(`/camps/${campId}/rsvps`);
}
export function rsvpToCamp(campId) {
  return api.post(`/camps/${campId}/rsvp`);
}
export function listMyRsvps() {
  return api.get("/camps/mine/rsvps");
}

// ---- Stats and badges ----
export function getDonorStats() {
  return api.get("/donors/me/stats");
}
export function getHospitalStats() {
  return api.get("/hospitals/me/stats");
}
export function getReceiverStats() {
  return api.get("/receivers/me/stats");
}

export function getPlatformStats() {
  return api.get("/stats/platform");
}

// ---- Admin: full visibility across every donor, hospital, and patient ----
export function getAllDonorsAdmin() {
  return api.get("/admin/donors");
}
export function getAllHospitalsAdmin() {
  return api.get("/admin/hospitals");
}
export function getAllReceiversAdmin() {
  return api.get("/admin/receivers");
}
export function getAllRequestsAdmin() {
  return api.get("/admin/requests");
}
export function getStockGivesAdmin() {
  return api.get("/admin/stock-gives");
}
export function getAllDonationsAdmin() {
  return api.get("/admin/donations");
}
export function getAllNotificationsAdmin() {
  return api.get("/admin/notifications");
}
export function getDonorHistoryAdmin(donorId) {
  return api.get(`/admin/donor/${donorId}/history`);
}
export function getHospitalHistoryAdmin(hospitalId) {
  return api.get(`/admin/hospital/${hospitalId}/history`);
}
export function getReceiverHistoryAdmin(receiverId) {
  return api.get(`/admin/receiver/${receiverId}/history`);
}
export function getAllStaffAdmin() {
  return api.get("/admin/staff");
}
export function getStaffHistoryAdmin(staffId) {
  return api.get(`/admin/staff/${staffId}/visitors`);
}

// ---- Hospital staff & shifts ----
export function createStaff(data) {
  return api.post("/staff", data);
}
export function listMyStaff() {
  return api.get("/staff");
}
export function removeStaff(staffId) {
  return api.delete(`/staff/${staffId}`);
}
export function getHospitalAllVisitors() {
  return api.get("/staff/hospital/visitors");
}
export function getMyStaffProfile() {
  return api.get("/staff/me");
}
export function logVisitor(data) {
  return api.post("/staff/visitors", data);
}
export function getMyVisitorEntries() {
  return api.get("/staff/visitors/mine");
}

// ---- AI features ----
export function getAiStatus() {
  return api.get("/ai/status");
}
export function parseRequestText(text, latitude, longitude) {
  return api.post("/ai/parse-request", { text, latitude, longitude });
}
export function transcribeAudio(blob) {
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  return api.post("/ai/transcribe", form);
}
export function askDonorAssistant(message) {
  return api.post("/ai/assistant/donor", { message });
}
export function askGuestAssistant(message) {
  return api.post("/ai/assistant/guest", { message });
}
export function askReceiverAssistant(message) {
  return api.post("/ai/assistant/receiver", { message });
}
export function askHospitalAssistant(message) {
  return api.post("/ai/assistant/hospital", { message });
}
export function askAdminAssistant(message) {
  return api.post("/ai/assistant/admin", { message });
}
export function askStaffAssistant(message) {
  return api.post("/ai/assistant/staff", { message });
}
export function getHospitalForecast() {
  return api.get("/ai/forecast/hospital");
}
export function getPlatformForecast() {
  return api.get("/ai/forecast/platform");
}

// ---- Admin verification + audit + delivery status ----
export function getPendingHospitals() { return api.get("/admin/verification/hospitals/pending"); }
export function approveHospital(id) { return api.post(`/admin/verification/hospitals/${id}/approve`); }
export function rejectHospital(id) { return api.post(`/admin/verification/hospitals/${id}/reject`); }
export function getPendingDonors() { return api.get("/admin/verification/donors/pending"); }
export function clearDonor(id, notes = "") { return api.post(`/admin/verification/donors/${id}/clear`, null, { params: { notes } }); }
export function flagDonor(id, notes = "") { return api.post(`/admin/verification/donors/${id}/flag`, null, { params: { notes } }); }
export function verifyAuditChain() { return api.get("/admin/audit/verify"); }
export function getAuditLog() { return api.get("/admin/audit/log"); }
export function getDeliveryStatus() { return api.get("/admin/delivery-status"); }

// ---- AI decision support ----
export function getNoShowPlan(requestId) { return api.get(`/ai/no-show-plan/${requestId}`); }
export function getAllocation() { return api.get("/ai/allocation"); }
export function getForecastAccuracy() { return api.get("/ai/forecast-accuracy"); }
export function getImpact() { return api.get("/ai/impact"); }
export function askDataAssistant(message) { return api.post("/ai/data-assistant", { message }); }
export function verifyDocument(docType, claimedNumber, file) {
  const form = new FormData();
  form.append("doc_type", docType);
  form.append("claimed_number", claimedNumber);
  form.append("file", file);
  return api.post("/ai/verify-document", form);
}

// ---- Push notifications ----
export function getPushStatus() { return api.get("/push/status"); }
export function subscribePush(subscription) { return api.post("/push/subscribe", subscription); }

// ---- Sentiment / flagged ratings ----
export function getFlaggedRatings() { return api.get("/ratings/flagged"); }

// ---- Donor re-engagement ----
export function getReengagementCandidates(hospitalId) {
  return api.get("/ai/re-engagement/candidates", { params: hospitalId ? { hospital_id: hospitalId } : {} });
}
export function draftReengagementMessage(donorId) { return api.get(`/ai/re-engagement/draft/${donorId}`); }
export function sendReengagementMessage(donorId, message) {
  return api.post("/ai/re-engagement/send", { donor_id: donorId, message });
}

// ---- Camp location suggestions ----
export function getCampSuggestions(days = 60) { return api.get("/ai/camp-suggestions", { params: { days } }); }

// ---- Reporting export ----
export function getReportSummary(params) { return api.get("/admin/reports/summary", { params }); }
export async function downloadReportCsv(params) {
  // A plain <a href> can't carry the auth token, so fetch as a blob and trigger the download manually.
  const response = await api.get("/admin/reports/export.csv", { params, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `lifeflow_report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---- Two-factor authentication ----
export function get2FAStatus(role) { return api.get(`/2fa/${role}/status`); }
export function setup2FA(role) { return api.post(`/2fa/${role}/setup`); }
export function enable2FA(role, code) { return api.post(`/2fa/${role}/enable`, { code }); }
export function disable2FA(role, password) { return api.post(`/2fa/${role}/disable`, { password }); }
export function verify2FALogin(tempToken, code) { return api.post("/auth/login/2fa-verify", { temp_token: tempToken, code }); }

export default api;

// ---- Forgot password (all five kinds of account) ----
export function forgotPassword(role, email) {
  return api.post("/auth/forgot-password", { role, email });
}
export function resetPassword(role, email, code, newPassword) {
  return api.post("/auth/reset-password", { role, email, code, new_password: newPassword });
}

// ---- Place -> position (the forms ask for words only) ----
export async function resolvePlace(place) {
  const response = await api.post("/location/resolve", {
    country: place.country, state: place.state || null, city: place.city,
    area: place.area || null, village: place.village || null,
  });
  return response.data;
}

// ---- Phone verification (OTP) ----
export function sendPhoneCode(phoneNumber, channel = "sms", email = "") {
  return api.post("/otp/send", { phone_number: phoneNumber || null, email: email || null, channel });
}
export function getOtpChannels() {
  return api.get("/otp/channels");
}
export function verifyPhoneCode(phoneNumber, code, email = "") {
  return api.post("/otp/verify", { phone_number: phoneNumber || null, email: email || null, code });
}

// ---- Donor health questionnaire, reminders, certificates ----
export function checkEligibility(answers) {
  return api.post("/donors/eligibility-check", answers);
}
export function getNextEligible() {
  return api.get("/donors/me/next-eligible");
}
export function setNotificationChannels(notifySms, notifyWhatsapp) {
  return api.put("/donors/me/notification-channels", { notify_sms: notifySms, notify_whatsapp: notifyWhatsapp });
}
export function getMyCertificates() {
  return api.get("/certificates/me");
}
export function verifyCertificateCode(code) {
  return api.get(`/certificates/verify/${encodeURIComponent(code)}`);
}

// ---- Emergency SOS and live tracking ----
export function sendSos(payload) {
  return api.post("/sos", payload);
}
export function getTracking(requestId) {
  return api.get(`/tracking/${requestId}`);
}
export function setDonorTrackingStatus(requestId, status) {
  return api.post(`/tracking/${requestId}/donor-status`, { status });
}

// ---- Blood expiry tracking ----
export function listMyBatches(includeClosed = false) {
  return api.get("/inventory/batches", { params: { include_closed: includeClosed } });
}
export function addMyBatch(payload) {
  return api.post("/inventory/batches", payload);
}
export function discardMyBatch(id) {
  return api.post(`/inventory/batches/${id}/discard`);
}

// ---- Hospital-to-hospital transfers ----
export function findSuppliers(bloodType) {
  return api.get("/transfers/suppliers", { params: { blood_type: bloodType } });
}
export function askForBlood(payload) {
  return api.post("/transfers", payload);
}
export function listMyTransfers() {
  return api.get("/transfers/mine");
}
export function respondToTransfer(id, action) {
  return api.post(`/transfers/${id}/respond`, { action });
}
export function confirmTransferArrival(id) {
  return api.post(`/transfers/${id}/receive`);
}
export function cancelTransfer(id) {
  return api.post(`/transfers/${id}/cancel`);
}

// ---- Bulk messages to donors ----
export function previewBulk(filter) {
  return api.post("/bulk/preview", filter);
}
export function sendBulk(payload) {
  return api.post("/bulk/send", payload);
}

// ---- Request review (fake-request protection) ----
export function listRequestsToReview() {
  return api.get("/moderation/requests");
}
export function approveReviewedRequest(id) {
  return api.post(`/moderation/requests/${id}/approve`);
}
export function rejectReviewedRequest(id, note) {
  return api.post(`/moderation/requests/${id}/reject`, { note: note || null });
}
export function runReminderJob() {
  return api.post("/moderation/jobs/reminders");
}
export function runExpirySweepJob() {
  return api.post("/moderation/jobs/expiry-sweep");
}

// ---- Excel / PDF downloads ----
export async function downloadExport(role, format) {
  // role is "admin" | "hospital" | "donor", or "camp/12" for one camp's attendance sheet
  const response = await api.get(`/exports/${role}/${format}`, { responseType: "blob" });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lifeflow_${String(role).replace("/", "_")}_${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}


// ---- Emergency directory (public to read) ----
export function listEmergencyContacts(params = {}) {
  return api.get("/directory", { params });
}
export function addEmergencyContact(payload) {
  return api.post("/directory", payload);
}
export function listMyEmergencyContacts() {
  return api.get("/directory/mine");
}
export function listPendingEmergencyContacts() {
  return api.get("/directory/pending");
}
export function approveEmergencyContact(id) {
  return api.post(`/directory/${id}/approve`);
}
export function deleteEmergencyContact(id) {
  return api.delete(`/directory/${id}`);
}

// ---- Invite friends ----
export function getMyReferral() {
  return api.get("/donors/me/referral");
}

// ---- Camp QR check-in ----
export function checkInDonor(campId, code) {
  return api.post(`/camps/${campId}/checkin`, { code });
}
export function getCampAttendance(campId) {
  return api.get(`/camps/${campId}/attendance`);
}

// ---- Staff roles ----
export function changeStaffRole(staffId, role) {
  return api.put(`/staff/${staffId}/role`, { role });
}
export function listDonorsToScreen() {
  return api.get("/staff/screening/donors");
}
export function screenDonor(donorId, decision, notes) {
  return api.post(`/staff/screening/donors/${donorId}/${decision}`, { notes: notes || null });
}

// ---- v6 AI features ----
export function getWeeklyReport(hospitalId) {
  return api.get("/ai/weekly-report", { params: hospitalId ? { hospital_id: hospitalId } : {} });
}
export function getWeeklyReportHistory() {
  return api.get("/ai/weekly-report/history");
}
export function generateWeeklyReport() {
  return api.post("/ai/weekly-report/generate");
}
export async function downloadWeeklyReport(reportId, format) {
  const response = await api.get(`/ai/weekly-report/${reportId}/export/${format}`, { responseType: "blob" });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lifeflow_weekly_report_${reportId}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
export function getEtaSuggestions(requestId) {
  return api.get(`/ai/eta/${requestId}`);
}
export function getCampForecast(campId, hours = 6) {
  return api.get(`/ai/camp-forecast/${campId}`, { params: { hours } });
}
export function getResponsePrediction(requestId) {
  return api.get(`/ai/response-prediction/${requestId}`);
}
export function askVoiceAssistant({ blob, text, language }) {
  const form = new FormData();
  form.append("language", language || "en");
  if (text) form.append("text", text);
  if (blob) form.append("file", blob, "voice.webm");
  return api.post("/ai/voice-assistant", form);
}
export function scanSlip(file) {
  const form = new FormData();
  form.append("file", file);
  return api.post("/ai/scan-slip", form);
}
export function interpretHealthAnswer(step, text, question, language) {
  return api.post("/ai/health-chat/interpret", { step, text, question: question || null, language: language || "en" });
}
export function transcribeHealthAnswer(blob, language) {
  const form = new FormData();
  form.append("language", language || "en");
  form.append("file", blob, "voice.webm");
  return api.post("/ai/health-chat/transcribe", form);
}
export function recheckMyEligibility(answers) {
  return api.post("/donors/me/eligibility", answers);
}

// ---- Native Android push (Firebase token) ----
export function registerDevice(token, platform = "android") { return api.post("/push/device", { token, platform }); }
export function unregisterDevice(token) { return api.post("/push/device/remove", { token }); }

// ---- Database backups (admin) ----
export function listBackups() { return api.get("/admin/backups"); }
export function runBackupNow() { return api.post("/admin/backups/run"); }
export async function downloadBackup(name) {
  const response = await api.get(`/admin/backups/download/${encodeURIComponent(name)}`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url; link.download = name; document.body.appendChild(link); link.click();
  link.remove(); URL.revokeObjectURL(url);
}

// ---- v15: features added from v14 ----

export function acceptStockOffer(offerId, units) {
  return api.post(`/stock-offers/${offerId}/accept`, { units });
}

export function addLabTest(data) {
  return api.post("/staff/lab-tests", data);
}

export function addStockBatch(data) {
  return api.post("/inventory/batches", data);
}

export function cancelMyDonation(id) {
  return api.post(`/donation-confirm/${id}/cancel`);
}

// ---- Forgot password straight from the database ----
export function checkForgotAccount(email) {
  return api.post("/auth/forgot-password/check", { email });
}

export function checkIn() {
  return api.post("/attendance/check-in");
}

export function checkOut() {
  return api.post("/attendance/check-out");
}

export function confirmDonation(id, units) {
  return api.post(`/donation-confirm/${id}/confirm`, { units });
}

export function decideShiftChange(changeId, decision) {
  return api.post(`/staff/shift-change/${changeId}/${decision}`);
}

// ---- v14: recovery, donations to confirm, attendance, lab, stock batches, SOS, reviews, timeline ----
export function forgotCheck(email) {
  return api.post("/auth/forgot-password/check", { email });
}

export function forgotFinish(token, newPassword, confirmPassword) {
  return api.post("/auth/forgot-password/reset", { token, new_password: newPassword, confirm_password: confirmPassword });
}

export function forgotSendCode(email) {
  return api.post("/auth/forgot-password/send-code", { email });
}

export function forgotVerify(email, answer, code) {
  return api.post("/auth/forgot-password/verify", { email, answer: answer || null, code: code || null });
}

export function getAllFeedback() {
  return api.get("/feedback/all");
}

export function getAllHospitalsVerification() {
  return api.get("/admin/verification/hospitals/all");
}

export function getAttendanceHistory(days = 14) {
  return api.get(`/attendance/history?days=${days}`);
}

// ---- Feedback about the app ----
export function getFeedbackStatus() {
  return api.get("/feedback/status");
}

export function getHospitalReviews(id) {
  return api.get(`/hospital-reviews/${id}`);
}

export function getHospitalShiftChanges() {
  return api.get("/staff/shift-change/hospital");
}

export function getLabTestTypes() {
  return api.get("/staff/lab-test-types");
}

export function getLabTests() {
  return api.get("/staff/lab-tests");
}

export function getMonthlyReport(month) {
  return api.get(`/attendance/report${month ? `?month=${month}` : ""}`);
}

export function getMyAttendance() {
  return api.get("/attendance/mine");
}

export function getMyPendingDonations() {
  return api.get("/donation-confirm/mine");
}

export function getMyProfile() {
  return api.get("/profile/me");
}

export function getMyShiftChanges() {
  return api.get("/staff/shift-change/mine");
}

export function getPendingDonations() {
  return api.get("/donation-confirm/pending");
}

export function getRegisteredPeople() {
  return api.get("/people/registered");
}

export function getRequestTimeline(id) {
  return api.get(`/requests/${id}/timeline`);
}

export function getStaffRoles() {
  return api.get("/staff/roles");
}

export function getStaffStockView() {
  return api.get("/staff/stock");
}

export function getStockBatches() {
  return api.get("/inventory/batches");
}

// ---- Hospital stock requests (accept / reject) ----
export function getStockOffers() {
  return api.get("/stock-offers");
}

export function getTeamAttendance() {
  return api.get("/attendance/team");
}

// ---- One login for everyone, and forgot password ----
export function loginAny(email, password) {
  return api.post("/auth/login", { email, password });
}

export function rateHospital(id, stars, comment) {
  return api.post(`/hospital-reviews/${id}`, { stars, comment });
}

export function rejectDonation(id) {
  return api.post(`/donation-confirm/${id}/reject`);
}

export function rejectHospitalWithReason(id, reason) {
  return api.post(`/admin/verification/hospitals/${id}/reject?reason=${encodeURIComponent(reason || "")}`);
}

export function rejectStockOffer(offerId) {
  return api.post(`/stock-offers/${offerId}/reject`);
}

// ---- Staff shift change requests ----
export function requestShiftChange(data) {
  return api.post("/staff/shift-change", data);
}

export function resetPasswordDirect(email, newPassword, confirmPassword) {
  return api.post("/auth/forgot-password/reset", { email, new_password: newPassword, confirm_password: confirmPassword });
}

export function resetStaffPassword(staffId, newPassword) {
  return api.post(`/staff/${staffId}/reset-password`, { new_password: newPassword });
}

export function runChecksNow() {
  return api.post("/admin/run-checks");
}

export function sendAppFeedback(stars, comment) {
  return api.post("/feedback", { stars, comment });
}

export function setSecurityQuestion(question, answer, currentPassword) {
  return api.post("/profile/security-question", { question, answer, current_password: currentPassword });
}

// ---- One person, both roles (donor and patient) ----
export function getMyRoles() {
  return api.get("/auth/roles");
}
export function switchRole(role) {
  return api.post("/auth/switch-role", { role });
}
export function addDonorRole(payload) {
  return api.post("/auth/add-role/donor", payload);
}
export function addPatientRole(payload) {
  return api.post("/auth/add-role/patient", payload);
}

// ---- Patient decides about a donor's offer, then says whether the blood arrived ----
export function getPatientOffers() {
  return api.get("/patient-offers/mine");
}
export function answerPatientOffer(id, accept) {
  return api.post(`/patient-offers/${id}/answer`, { accept });
}
export function markOfferReceived(id, received, units) {
  return api.post(`/patient-offers/${id}/received`, { received, units: units ?? null });
}

// ---- Online chat between donor and patient ----
export function getChat(donationId) {
  return api.get(`/chat/${donationId}`);
}
export function sendChat(donationId, text) {
  return api.post(`/chat/${donationId}`, { text });
}
