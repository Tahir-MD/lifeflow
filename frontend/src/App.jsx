import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import NavigationBar from "./components/NavigationBar.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import OfflineBanner from "./components/OfflineBanner.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";
import UpdatePrompt from "./components/UpdatePrompt.jsx";
import Home from "./pages/Home.jsx";
import DonorDashboard from "./pages/DonorDashboard.jsx";
import ReceiverDashboard from "./pages/ReceiverDashboard.jsx";
import HospitalDashboard from "./pages/HospitalDashboard.jsx";
import AdminChangeCredentials from "./pages/AdminChangeCredentials.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import StaffDashboard from "./pages/StaffDashboard.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import AddRole from "./pages/AddRole.jsx";
import MyProfile from "./pages/MyProfile.jsx";
import RegisteredPeople from "./pages/RegisteredPeople.jsx";
import AIAssistantWidget from "./components/AIAssistantWidget.jsx";
import FeedbackPopup from "./components/FeedbackPopup.jsx";
import { ToastProvider } from "./components/ToastContext.jsx";
import VerifyCertificate from "./pages/VerifyCertificate.jsx";
import EmergencyDirectory from "./pages/EmergencyDirectory.jsx";

export default function App() {
  return (
    <BrowserRouter>
     <ToastProvider>
      <NavigationBar />
      <OfflineBanner />
      <UpdatePrompt />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/donor/register" element={<Navigate to="/signup?role=donor" replace />} />
        <Route path="/donor/dashboard" element={<DonorDashboard />} />
        <Route path="/receiver/register" element={<Navigate to="/signup?role=patient" replace />} />
        <Route path="/receiver/dashboard" element={<ReceiverDashboard />} />
        <Route path="/hospital/register" element={<Navigate to="/signup?role=hospital" replace />} />
        <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
        <Route path="/admin/change-credentials" element={<AdminChangeCredentials />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/add-role/:kind" element={<AddRole />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/people" element={<RegisteredPeople />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password/:role" element={<ForgotPassword />} />
        {/* The five old login addresses still work: they all open the one login page. */}
        <Route path="/donor/login" element={<Navigate to="/login" replace />} />
        <Route path="/receiver/login" element={<Navigate to="/login" replace />} />
        <Route path="/hospital/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/staff/login" element={<Navigate to="/login" replace />} />
        <Route path="/verify/:code" element={<VerifyCertificate />} />
        <Route path="/emergency" element={<EmergencyDirectory />} />
      </Routes>
      <InstallPrompt />
      <SiteFooter />
      <FeedbackPopup />
      <AIAssistantWidget />
     </ToastProvider>
    </BrowserRouter>
  );
}
