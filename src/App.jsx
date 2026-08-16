import React, { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSettings } from "./context/SettingsContext.jsx";
import Layout from "./components/Layout.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Subscriptions from "./pages/Subscriptions.jsx";
import Capital from "./pages/Capital.jsx";
import Lenses from "./pages/Lenses.jsx";
import Assets from "./pages/Assets.jsx";

// Gating logic: the onboarding "details" popup is only required for the data
// pages. The Assets page is informational (prompt + download), so a user who
// deep-links straight to /assets sees it without being forced through setup.
// If they then navigate to a data page while setup is incomplete, the popup
// appears.
function Shell({ needsSetup }) {
  const location = useLocation();
  const onAssets = location.pathname === "/assets";

  if (needsSetup && !onAssets) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/capital" element={<Capital />} />
        <Route path="/lenses" element={<Lenses />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const { settings, loadSettings, editing } = useSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const needsSetup = !settings || editing;

  return (
    <HashRouter>
      <Shell needsSetup={needsSetup} />
    </HashRouter>
  );
}
