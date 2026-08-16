// Client-side transaction categorization. No server involved.
// Uses the user's own OpenAI key (stored locally) when provided, otherwise
// relies on the deterministic categorization already applied by csvParser.

import { CATEGORIES } from "./finance.js";
import { categorizeTransaction, cleanMerchantName } from "./csvParser.js";

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
    cleanMerchant: x.cleanMerchant || cleanMerchantName(x.rawDescription),
    category: (x.category || "OTHER").toUpperCase(),
    needsReview: !!x.needsReview,
    intent: x.intent ? x.intent.toUpperCase() : null,
  }));
}

// `rows` are expected to already be parsed + locally categorized by csvParser.
// If an API key is present we refine with OpenAI, otherwise pass through.
export async function categorizeTransactions(rows, apiKey) {
  if (apiKey) {
    try {
      return await openAiCategorize(rows, apiKey);
    } catch (e) {
      console.warn("OpenAI categorization failed, using local fallback:", e.message);
    }
  }
  return rows;
}

export { categorizeTransaction, cleanMerchantName };
