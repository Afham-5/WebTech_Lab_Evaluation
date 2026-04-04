// ==================== AI ITINERARY DISPLAY & REGENERATION ====================

import { trips, currentTripId, saveTrips } from "./store.js";
import { calcDays, getCurrencySymbol, escHtml, showToast } from "./utils.js";
import { generateTravelItinerary } from "./api.js";
import { displayTrips } from "./trips.js";

export function displayAIItinerary() {
  const trip = trips.find((t) => t.id === currentTripId);
  const container = document.getElementById("aiItineraryContent");

  if (!trip || !trip.itinerary) {
    container.innerHTML = `
            <div class="empty-itinerary">
                <span class="empty-icon">🤖</span>
                <p>No AI itinerary generated yet.</p>
                <button class="btn btn-primary" onclick="regenerateItinerary()">Generate Now</button>
            </div>`;
    return;
  }

  const itin = trip.itinerary;
  const sym = getCurrencySymbol(trip.currency);
  const totalDays = itin.totalDays || calcDays(trip.startDate, trip.endDate);

  let html = `
        <div class="ai-itinerary-header">
            <h4>${escHtml(itin.tripName || trip.name)}</h4>
            <p>📍 ${escHtml(itin.destination || trip.destination)} · ${totalDays} days · ${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''}</p>
            ${itin.totalEstimatedCost ? `<div class="itin-cost">💰 Estimated Total: ${sym}${Number(itin.totalEstimatedCost).toLocaleString()}</div>` : ""}
        </div>`;

  if (itin.highlights?.length) {
    html += `<div class="itinerary-highlights">
            <strong>✨ Trip Highlights</strong>
            <ul>${itin.highlights.map((h) => `<li>${escHtml(h)}</li>`).join("")}</ul>
        </div>`;
  }

  if (itin.tips) {
    html += `<div class="itinerary-tips-block">💡 <strong>Travel Tips:</strong> ${escHtml(itin.tips)}</div>`;
  }

  if (itin.itinerary?.length) {
    html += '<div class="days-timeline">';
    itin.itinerary.forEach((day, idx) => {
      const isFirst = idx === 0;
      html += `
            <div class="day-plan">
                <div class="day-plan-header" onclick="toggleDay(this)">
                    <div>
                        <div class="day-number">Day ${day.day}${day.date ? ' · ' + day.date : ''}</div>
                        <div class="day-theme">${escHtml(day.theme || "")}</div>
                        ${day.notableSpots ? `<div class="day-notable">📍 ${escHtml(day.notableSpots)}</div>` : ""}
                    </div>
                    <div style="display:flex;align-items:center;gap:.75rem;">
                        ${day.dayTotal ? `<span class="day-total">${sym}${Number(day.dayTotal).toLocaleString()}</span>` : ""}
                        <span class="day-chevron${isFirst ? ' open' : ''}">▼</span>
                    </div>
                </div>
                <div class="day-plan-body${isFirst ? ' open' : ''}">`;

      if (day.activities?.length) {
        html += '<div class="activity-timeline">';
        day.activities.forEach((act) => {
          const cat = escHtml(act.category || "");
          html += `
                    <div class="activity-block" data-category="${cat}">
                        <div class="activity-block-time">⏰ ${escHtml(act.time || "")}</div>
                        <div class="activity-block-name">${escHtml(act.name || "")}</div>
                        <div class="activity-block-desc">${escHtml(act.description || "")}</div>
                        <div class="activity-block-meta">
                            <span class="meta-badge">${cat}</span>
                            ${act.estimatedCost ? `<span class="meta-badge cost-badge">${sym}${Number(act.estimatedCost).toLocaleString()}</span>` : ""}
                        </div>
                        ${act.tips ? `<div class="activity-block-tip">💡 ${escHtml(act.tips)}</div>` : ""}
                    </div>`;
        });
        html += '</div>';
      }

      if (day.mealRecommendations) {
        const m = day.mealRecommendations;
        html += `
                <div class="meals-block">
                    <strong>🍽️ Meal Recommendations</strong>
                    <div class="meals-grid">
                        <div class="meal-card">
                            <span class="meal-emoji">🌅</span>
                            <div class="meal-type">Breakfast</div>
                            <div class="meal-name">${escHtml(m.breakfast || "Local options")}</div>
                        </div>
                        <div class="meal-card">
                            <span class="meal-emoji">☀️</span>
                            <div class="meal-type">Lunch</div>
                            <div class="meal-name">${escHtml(m.lunch || "Local options")}</div>
                        </div>
                        <div class="meal-card">
                            <span class="meal-emoji">🌙</span>
                            <div class="meal-type">Dinner</div>
                            <div class="meal-name">${escHtml(m.dinner || "Local options")}</div>
                        </div>
                    </div>
                </div>`;
      }

      html += `</div></div>`;
    });
    html += '</div>';
  }

  container.innerHTML = html;
}

export function toggleDay(header) {
  const body = header.nextElementSibling;
  const chevron = header.querySelector(".day-chevron");
  const isOpen = body.classList.toggle("open");
  if (chevron) chevron.classList.toggle("open", isOpen);
}

export async function regenerateItinerary() {
  const trip = trips.find((t) => t.id === currentTripId);
  if (!trip) return;

  const days = calcDays(trip.startDate, trip.endDate);
  showToast("🤖 Regenerating itinerary…", "info", 60000);

  try {
    const itinerary = await generateTravelItinerary(trip, days);
    trip.itinerary = itinerary;
    saveTrips();
    displayAIItinerary();

    // Switch to AI tab
    document
      .querySelectorAll(".tab-button")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    document.querySelector('[data-tab="ai-itinerary"]').classList.add("active");
    document.getElementById("ai-itinerary").classList.add("active");

    showToast("✅ Itinerary regenerated!", "success");
    displayTrips();
  } catch (err) {
    showToast("Failed to regenerate: " + err.message, "error", 5000);
  }
}
