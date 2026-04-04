// ==================== TRIP DISPLAY & CARDS ====================

import { trips, currentFilter } from "./store.js";
import { formatDate, calcDays, getCurrencySymbol, escHtml } from "./utils.js";

export function getTripStatus(trip) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(trip.startDate);
  s.setHours(0, 0, 0, 0);
  const e = new Date(trip.endDate);
  e.setHours(0, 0, 0, 0);
  if (today < s) return { text: "Upcoming", class: "status-upcoming" };
  if (today > e) return { text: "Completed", class: "status-completed" };
  return { text: "Ongoing", class: "status-ongoing" };
}

export function calcExpense(tripId) {
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) return 0;
  return trip.activities.reduce((sum, a) => sum + a.cost, 0);
}

export function displayTrips() {
  const grid = document.getElementById("tripsGrid");
  const countEl = document.getElementById("tripsCount");
  grid.innerHTML = "";

  let filtered = trips;
  if (currentFilter !== "all") {
    filtered = trips.filter(
      (t) => getTripStatus(t).class === `status-${currentFilter}`,
    );
  }

  if (countEl)
    countEl.textContent = `${filtered.length} trip${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    const isEmpty = trips.length === 0;
    grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${isEmpty ? "🗺️" : "🔍"}</div>
                <h3>${isEmpty ? "No trips yet" : "No trips match this filter"}</h3>
                <p>${isEmpty ? "Start planning your next adventure" : "Try selecting a different filter"}</p>
                ${isEmpty ? `<button class="btn btn-primary" onclick="navigateTo('planner')">Plan a Trip</button>` : ""}
            </div>`;
    return;
  }

  // Sort: ongoing first, then upcoming by start date, then completed by end date desc
  filtered.sort((a, b) => {
    const sa = getTripStatus(a).class;
    const sb = getTripStatus(b).class;
    const order = {
      "status-ongoing": 0,
      "status-upcoming": 1,
      "status-completed": 2,
    };
    if (order[sa] !== order[sb]) return order[sa] - order[sb];
    return new Date(a.startDate) - new Date(b.startDate);
  });

  filtered.forEach((trip) => grid.appendChild(createTripCard(trip)));
}

function createTripCard(trip) {
  const card = document.createElement("div");
  card.className = "trip-card";
  const status = getTripStatus(trip);
  const duration = calcDays(trip.startDate, trip.endDate);
  const spent = calcExpense(trip.id);
  const sym = getCurrencySymbol(trip.currency);

  card.innerHTML = `
        <div class="trip-card-header">
            <h3>${escHtml(trip.name)}</h3>
            <span class="trip-status ${status.class}">${status.text}</span>
        </div>
        <div class="trip-card-body">
            <div class="trip-info">📍 <strong>${escHtml(trip.destination)}</strong></div>
            <div class="trip-info">📅 ${formatDate(trip.startDate)} → ${formatDate(trip.endDate)} &nbsp;(${duration}d)</div>
            <div class="trip-info">👥 ${trip.travelers} traveler${trip.travelers > 1 ? "s" : ""} &nbsp;·&nbsp; 🏷️ ${trip.tripType}</div>
            <div class="trip-info">💰 ${sym}${trip.budget.toLocaleString()} total &nbsp;·&nbsp; Spent: ${sym}${spent.toLocaleString()}</div>
            <span class="itinerary-badge ${trip.itinerary ? "has-itinerary" : "no-itinerary"}">
                ${trip.itinerary ? "✅ AI Itinerary Ready" : "⏳ No Itinerary Yet"}
            </span>
            <div class="trip-actions">
                <button class="btn-view" onclick="openTripDetails(${trip.id})">View Details</button>
                <button onclick="editTrip(${trip.id})">Edit</button>
            </div>
        </div>`;
  return card;
}
