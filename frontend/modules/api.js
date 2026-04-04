// ==================== BACKEND API INTEGRATION ====================

const API_BASE_URL = "http://localhost:3000";

export async function generateTravelItinerary(trip, days) {
  const response = await fetch(`${API_BASE_URL}/api/generate-itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trip, days }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error || response.statusText;

    if (response.status === 429)
      throw new Error("Rate limit reached. Please wait a moment and try again.");
    throw new Error(msg || `Server error ${response.status}`);
  }

  const itinerary = await response.json();
  return itinerary;
}
