// ==================== ACTIVITIES ====================

import { trips, currentTripId, saveTrips } from "./store.js";
import { formatDate, getCurrencySymbol, escHtml, showToast } from "./utils.js";

export function addActivity() {
  if (!currentTripId) {
    showToast("Please open a trip first", "error");
    return;
  }
  const trip = trips.find((t) => t.id === currentTripId);

  const date = document.getElementById("activityDate").value;
  const name = document.getElementById("activityName").value.trim();
  const category = document.getElementById("activityCategory").value;
  const time = document.getElementById("activityTime").value;
  const cost = parseFloat(document.getElementById("activityCost").value) || 0;

  if (!name || !date) {
    showToast("Please fill in activity name and date", "error");
    return;
  }

  const actDate = new Date(date);
  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);
  if (actDate < tripStart || actDate > tripEnd) {
    showToast(
      `Date must be between ${formatDate(trip.startDate)} and ${formatDate(trip.endDate)}`,
      "error",
    );
    return;
  }

  trip.activities.push({
    id: Date.now(),
    date,
    name,
    category,
    time: time || "09:00",
    cost,
  });
  saveTrips();
  document.getElementById("activityName").value = "";
  document.getElementById("activityTime").value = "";
  document.getElementById("activityCost").value = "";
  displayActivities();
  showToast("Activity added!", "success", 2000);
}

export function displayActivities() {
  const trip = trips.find((t) => t.id === currentTripId);
  const list = document.getElementById("activitiesList");
  list.innerHTML = "";

  if (!trip || trip.activities.length === 0) {
    list.innerHTML =
      '<p style="text-align:center;color:var(--muted);padding:2rem 0;">No activities added yet</p>';
    return;
  }

  const sorted = [...trip.activities].sort(
    (a, b) => new Date(a.date + "T" + a.time) - new Date(b.date + "T" + b.time),
  );

  let lastDate = null;
  sorted.forEach((act) => {
    if (lastDate !== act.date) {
      lastDate = act.date;
      const h = document.createElement("div");
      h.style.cssText =
        "font-weight:700;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase;color:var(--brand);margin:1.25rem 0 .5rem;";
      h.textContent = formatDate(act.date);
      list.appendChild(h);
    }
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `
            <div class="activity-details">
                <span class="activity-category">${act.category}</span>
                <div class="activity-name">${escHtml(act.name)}</div>
                <div class="activity-time">⏰ ${act.time}</div>
            </div>
            <div style="display:flex;align-items:center;gap:.75rem;">
                <div class="activity-cost">${getCurrencySymbol(trip.currency)}${act.cost.toFixed(2)}</div>
                <button class="delete-btn" onclick="deleteActivity(${act.id})" title="Delete">✕</button>
            </div>`;
    list.appendChild(item);
  });
}

export function deleteActivity(activityId) {
  const trip = trips.find((t) => t.id === currentTripId);
  trip.activities = trip.activities.filter((a) => a.id !== activityId);
  saveTrips();
  displayActivities();
  showToast("Activity removed", "info", 2000);
}
