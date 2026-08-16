import React, { createContext, useContext, useEffect, useState } from "react";
import { getSettings, saveSettings } from "../lib/db.js";
import { getHourlyRate } from "../lib/finance.js";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);

  async function loadSettings() {
    const s = await getSettings();
    setSettings(s || null);
    setReady(true);
    return s || null;
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function update(next) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    await saveSettings(merged);
    setEditing(false);
    return merged;
  }

  return (
    <SettingsContext.Provider
      value={{ settings, setSettings: update, loadSettings, ready, editing, setEditing }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export { getHourlyRate };
