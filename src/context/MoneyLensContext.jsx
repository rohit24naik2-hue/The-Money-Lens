// Global state provider for The Money Lens. A single live source of truth so
// every tab (Dashboard, Import, Subscriptions, Lenses) instantly shares the same
// data in real-time. Backed by Dexie/IndexedDB (not localStorage) and kept in
// sync via the DATA_MUTATED_EVENT window event bus.

import React, { createContext, useContext } from "react";
import { useSettings } from "./SettingsContext.jsx";
import { useLiveData } from "../lib/useLiveData.js";
import {
  loadTransactions,
  importTransactions,
  clearAll,
} from "../lib/store.js";

const MoneyLensContext = createContext(undefined);

export function MoneyLensProvider({ children }) {
  const { settings, setSettings } = useSettings();
  const [transactions] = useLiveData(loadTransactions);

  // Live, shared across all tabs via the event bus.
  const takeHomeIncome = Number(settings?.monthlyTakeHome) || 0;

  const addTransactions = (newItems) => importTransactions(newItems);
  const setTakeHomeIncome = (amount) =>
    setSettings({ monthlyTakeHome: Number(amount) });
  const clearAllData = () => clearAll();

  return (
    <MoneyLensContext.Provider
      value={{
        transactions: transactions || [],
        takeHomeIncome,
        addTransactions,
        setTakeHomeIncome,
        clearAllData,
      }}
    >
      {children}
    </MoneyLensContext.Provider>
  );
}

export function useMoneyLens() {
  const ctx = useContext(MoneyLensContext);
  if (!ctx) throw new Error("useMoneyLens must be used within a MoneyLensProvider");
  return ctx;
}
