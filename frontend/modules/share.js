// ==================== PRINT / SHARE ====================

import { trips, currentTripId } from "./store.js";
import { formatDate, getCurrencySymbol, escHtml, showToast } from "./utils.js";

function buildItineraryHTML(trip) {
  const sym = getCurrencySymbol(trip.currency);

  let content = `
    <html><head><title>${trip.name}</title>
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; color: #222; }
        h1 { font-size: 2rem; margin-bottom: .5rem; }
        h2 { font-size: 1.4rem; margin: 2rem 0 .5rem; color: #C84B31; }
        h3 { color: #44403C; }
        p { margin: .4rem 0; }
        .act { margin-bottom: .75rem; padding: .75rem; background: #FAF9F7; border-left: 3px solid #C84B31; }
        .meal { display:inline-block; margin:.25rem .5rem .25rem 0; padding:.3rem .7rem; background:#FFF7ED; border-radius:4px; font-size:.9rem; }
    </style></head><body>
    <h1>${escHtml(trip.name)}</h1>
    <p><strong>Destination:</strong> ${escHtml(trip.destination)}</p>
    <p><strong>Dates:</strong> ${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}</p>
    <p><strong>Budget:</strong> ${sym}${trip.budget.toLocaleString()} ${trip.currency || ""}</p>
    <p><strong>Travelers:</strong> ${trip.travelers}</p>`;

  if (trip.itinerary?.itinerary) {
    content += "<h2>AI-Generated Itinerary</h2>";
    trip.itinerary.itinerary.forEach((day) => {
      content += `<h3>Day ${day.day} – ${escHtml(day.theme || "")}</h3>`;
      day.activities?.forEach((act) => {
        content += `<div class="act"><strong>${escHtml(act.time)}</strong> – ${escHtml(act.name)}<br><small>${escHtml(act.description || "")}</small>${act.estimatedCost ? `<br><small>Est. cost: ${sym}${Number(act.estimatedCost).toLocaleString()}</small>` : ""}</div>`;
      });
      if (day.mealRecommendations) {
        const m = day.mealRecommendations;
        content += `<p><strong>🍽️ Meals:</strong>
          <span class="meal">🌅 ${escHtml(m.breakfast || "")}</span>
          <span class="meal">☀️ ${escHtml(m.lunch || "")}</span>
          <span class="meal">🌙 ${escHtml(m.dinner || "")}</span></p>`;
      }
    });
  }

  if (trip.activities?.length) {
    content += "<h2>Custom Activities</h2>";
    trip.activities.forEach((a) => {
      content += `<div class="act">${formatDate(a.date)} ${a.time} – <strong>${escHtml(a.name)}</strong> (${a.category}) – ${sym}${a.cost.toFixed(2)}</div>`;
    });
  }

  content += "</body></html>";
  return content;
}

export function printItinerary() {
  const trip = trips.find((t) => t.id === currentTripId);
  if (!trip) return;
  const win = window.open("", "_blank");
  win.document.write(buildItineraryHTML(trip));
  win.document.close();
  win.print();
}

export async function shareTrip() {
  const trip = trips.find((t) => t.id === currentTripId);
  if (!trip) return;

  const html = buildItineraryHTML(trip);
  const fileName = `${trip.name.replace(/[^a-z0-9]/gi, "_")}_itinerary.html`;

  // Mobile: share as a file via native share sheet
  if (navigator.canShare) {
    const file = new File([html], fileName, { type: "text/html" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: trip.name, files: [file] });
        return;
      } catch (err) {
        if (err.name !== "AbortError") console.warn("File share failed, falling back:", err);
        else return;
      }
    }
  }

  // Desktop fallback: download the HTML file
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  showToast("📄 Itinerary downloaded as HTML file!", "success");
}
