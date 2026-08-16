import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSettings } from "./context/SettingsContext.jsx";
import Layout from "./components/Layout.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Import from "./pages/Import.jsx";
import Subscriptions from "./pages/Subscriptions.jsx";
import Capital from "./pages/Capital.jsx";
import Lenses from "./pages/Lenses.jsx";

export default function App() {
  const { settings, loadSettings, editing } = useSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const needsSetup = !settings || editing;

  if (needsSetup) {
    return (
      <BrowserRouter>
        <Onboarding />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/import" element={<Import />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/capital" element={<Capital />} />
          <Route path="/lenses" element={<Lenses />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
