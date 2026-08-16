import Dexie from "dexie";

// Privacy-first local store. Everything lives in the browser's IndexedDB.
// No backend, no network calls for user data.
export const db = new Dexie("the-money-lens");

db.version(1).stores({
  settings: "id", // single row with id = 'local-user'
  transactions: "id, date, category, needsReview",
  subscriptions: "id, status",
  sinkingFunds: "id",
  decisionLogs: "id, module, date",
});

export const SETTINGS_ID = "local-user";

export async function getSettings() {
  return db.settings.get(SETTINGS_ID);
}

export async function saveSettings(settings) {
  return db.settings.put({ id: SETTINGS_ID, ...settings });
}

export default db;
