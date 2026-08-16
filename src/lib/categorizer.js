// Client-side transaction categorization. No server involved.
// Uses the user's own OpenAI key (stored locally) when provided, otherwise
// falls back to a deterministic keyword categorizer so the app works offline.

import { CATEGORIES } from "./finance.js";

const KEYWORDS = {
  RENT: ["rent", "lease", "landlord", "apartment", "mortgage", "housing"],
  FOOD: [
    "grocery", "groceries", "supermarket", "food", "restaurant", "cafe", "coffee",
    "doordash", "uber eats", "grubhub", "mcdonald", "chipotle", "starbucks",
    "whole foods", "trader joe", "safeway", "costco", "walmart", "dining",
  ],
  SUBSCRIPTIONS: [
    "netflix", "spotify", "disney", "hulu", "youtube", "apple music", "adobe",
    "notion", "figma", "github", "chatgpt", "openai", "anthropic", "subscription",
    "membership", "prime", "audible", "peloton",
  ],
  TRANSPORT: [
    "uber", "lyft", "gas", "shell", "chevron", "transit", "metro", "train",
    "parking", "toll", "fuel", "car", "auto", "bike",
  ],
  FUN: [
    "movie", "cinema", "steam", "playstation", "xbox", "nintendo", "game",
    "concert", "ticket", "bar", "pub", "club", "travel", "hotel", "airbnb",
    "event", "hobby",
  ],
  OTHER: [],
};

export function normalizeMerchant(raw) {
  let s = (raw || "").replace(/^(sq|sq\*|sq\s?\*)\s*/i, "");
  s = s.replace(/\b\d{4}\b/g, "").trim();
  s = s.replace(/\s+/g, " ").trim();
  return s || raw || "Unknown";
}

function localCategorize(rows) {
  return rows.map((row) => {
    const raw = row.rawDescription || row.description || "";
    const text = raw.toLowerCase();
    let winner = "OTHER";
    let max = 0;
    for (const [cat, words] of Object.entries(KEYWORDS)) {
      let score = 0;
      for (const w of words) if (text.includes(w.toLowerCase())) score++;
      if (score > max) {
        max = score;
        winner = cat;
      }
    }
    return {
      rawDescription: raw,
      cleanMerchant: normalizeMerchant(raw),
      category: winner,
      needsReview: max === 0,
      intent: null,
    };
  });
}

async function openAiCategorize(rows, apiKey) {
  const payload = rows.map((r) => r.rawDescription || r.description || "");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a financial transaction categorizer for "The Money Lens".
Categorize each transaction into EXACTLY one of: ${CATEGORIES.join(", ")}.
Normalize merchant names (e.g. 'SQ *FOODTRUCK' -> 'Square Food Truck').
If uncertain, set needsReview true.
Respond ONLY with JSON: an array of objects with keys rawDescription, cleanMerchant, category, needsReview.`,
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });
  if (!res.ok) throw new Error("OpenAI request failed");
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  const arr = Array.isArray(parsed) ? parsed : parsed.results || parsed.transactions;
  return arr.map((x) => ({
    rawDescription: x.rawDescription,
    cleanMerchant: x.cleanMerchant || normalizeMerchant(x.rawDescription),
    category: (x.category || "OTHER").toUpperCase(),
    needsReview: !!x.needsReview,
    intent: x.intent ? x.intent.toUpperCase() : null,
  }));
}

export async function categorizeTransactions(rows, apiKey) {
  if (apiKey) {
    try {
      return await openAiCategorize(rows, apiKey);
    } catch (e) {
      console.warn("OpenAI categorization failed, using local fallback:", e.message);
    }
  }
  return localCategorize(rows);
}
