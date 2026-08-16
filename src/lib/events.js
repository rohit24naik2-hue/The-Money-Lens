// Decoupled browser event bus: any part of the app can announce that local
// data changed, and any view can listen (via window event) to re-render live
// without a page refresh. Works alongside Dexie/IndexedDB storage.

// Custom event name for local database changes
export const DATA_MUTATED_EVENT = "money_lens_data_mutated";

export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATA_MUTATED_EVENT));
  }
}
