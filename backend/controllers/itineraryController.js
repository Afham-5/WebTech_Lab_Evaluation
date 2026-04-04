import { GoogleGenAI } from "@google/genai";
import { getCurrencySymbol, sanitize, repairTruncatedJSON } from "../utils/helpers.js";

/**
 * POST /api/generate-itinerary
 * Body: { trip: { destination, travelers, startDate, endDate, budget, currency, tripType, pace, foodPreference, dietary, interests, notes }, days: number }
 * Returns: JSON itinerary object
 */
export const generateItinerary = async (req, res) => {
  try {
    // Initialize Gemini AI client here, so dotenv has already loaded the API key
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const { trip, days } = req.body;

    if (!trip || !days) {
      return res.status(400).json({ error: "Missing 'trip' or 'days' in request body" });
    }

    const sym = getCurrencySymbol(trip.currency);
    const dailyBudget = (trip.budget / days).toFixed(2);

    const isLongTrip = days > 7;
    const activitiesPerDay = isLongTrip ? "3-4" : "4-6";
    const conciseNote = isLongTrip
      ? "\nCRITICAL: This is a long trip. Keep descriptions SHORT (1 sentence max). Keep tips SHORT (under 10 words). Keep meal recommendations to just the name. Do NOT be verbose — brevity is essential to fit within response limits."
      : "";

    const prompt = `You are an expert travel planner. Create a detailed, practical, day-by-day travel itinerary.

IMPORTANT: Respond with ONLY a valid JSON object — no markdown, no backticks, no explanation, no extra text before or after.${conciseNote}

Required JSON structure:
{
  "tripName": "string",
  "destination": "string",
  "totalDays": number,
  "dailyBudget": number,
  "itinerary": [
    {
      "day": number,
      "date": "YYYY-MM-DD",
      "theme": "short theme for the day",
      "activities": [
        {
          "time": "HH:MM",
          "name": "activity name",
          "description": "brief description",
          "category": "Sightseeing|Dining|Adventure|Rest|Transport|Shopping|Other",
          "estimatedCost": number,
          "tips": "short tip"
        }
      ],
      "mealRecommendations": {
        "breakfast": "recommendation",
        "lunch": "recommendation",
        "dinner": "recommendation"
      },
      "dayTotal": number,
      "notableSpots": "2-3 notable spots"
    }
  ],
  "totalEstimatedCost": number,
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "tips": "overall travel tips for this destination"
}

TRIP DETAILS:
- Destination: ${sanitize(trip.destination)}
- Travelers: ${trip.travelers}
- Duration: ${days} days (starting ${trip.startDate})
- Total Budget: ${sym}${trip.budget} ${trip.currency}
- Daily Budget: ${sym}${dailyBudget}
- Trip Type: ${sanitize(trip.tripType)}
- Pace: ${sanitize(trip.pace || "Moderate")}
- Food Preference: ${sanitize(trip.foodPreference)}${trip.dietary ? " | Dietary Restrictions: " + sanitize(trip.dietary) : ""}${trip.interests ? "\n- Special Interests: " + sanitize(trip.interests) : ""}${trip.notes ? "\n- Notes: " + sanitize(trip.notes) : ""}

Generate a complete ${days}-day itinerary. Each day should have ${activitiesPerDay} activities with realistic timing. Meals must respect the food preference. Keep all costs within the daily budget. Return ONLY the JSON object.`;

    console.log(`📍 Generating itinerary for: ${trip.destination} (${days} days)`);

    // Call Gemini using @google/genai SDK
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 65536,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return res.status(500).json({ error: "Empty response from Gemini. Please try again." });
    }

    // Parse the JSON response
    let cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let jsonObj;
    try {
      jsonObj = JSON.parse(cleaned);
    } catch (e1) {
      try {
        const start = cleaned.indexOf("{");
        if (start === -1) throw new Error("No JSON object found in response");
        let jsonStr = cleaned.substring(start);
        jsonStr = repairTruncatedJSON(jsonStr);
        jsonObj = JSON.parse(jsonStr);
        console.warn("⚠️ Parsed repaired (truncated) JSON — some days may be missing.");
      } catch (e2) {
        console.error("Raw response:", cleaned.substring(0, 500));
        console.error("JSON parse error:", e2.message);
        return res.status(500).json({
          error: `Failed to parse Gemini response as JSON: ${e2.message}`,
        });
      }
    }

    console.log(`✅ Itinerary generated successfully for ${trip.destination}`);
    res.json(jsonObj);
  } catch (err) {
    console.error("❌ Error generating itinerary:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/health
 * Returns: { status: "ok", timestamp: ISO string }
 */
export const healthCheck = (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};
