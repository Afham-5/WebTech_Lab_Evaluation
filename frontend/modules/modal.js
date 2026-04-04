// ==================== MODAL & TRIP DETAILS ====================

import { trips, currentTripId, setCurrentTripId, setTrips, saveTrips } from "./store.js";
import { formatDate, calcDays, getCurrencySymbol, showToast } from "./utils.js";
import { getTripStatus, displayTrips } from "./trips.js";
import { displayActivities } from "./activities.js";
import { displayAIItinerary } from "./itinerary.js";

export function openTripDetails(tripId) {
  setCurrentTripId(tripId);
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) return;

  document.getElementById("modalTripName").textContent = trip.name;
  const status = getTripStatus(trip);
  const statusEl = document.getElementById("tripStatus");
  statusEl.textContent = status.text;
  statusEl.className = `trip-status ${status.class}`;

  document.getElementById("modalDestination").textContent = trip.destination;
  document.getElementById("modalDuration").textContent =
    `${formatDate(trip.startDate)} → ${formatDate(trip.endDate)} (${calcDays(trip.startDate, trip.endDate)} days)`;
  document.getElementById("modalTravelers").textContent =
    `${trip.travelers} traveler${trip.travelers > 1 ? "s" : ""}`;
  document.getElementById("modalBudget").textContent =
    `${getCurrencySymbol(trip.currency)}${trip.budget.toLocaleString()} ${trip.currency || ""}`;
  document.getElementById("modalType").textContent =
    `${trip.tripType}${trip.pace ? " · " + trip.pace + " pace" : ""}`;
  document.getElementById("modalFood").textContent =
    `${trip.foodPreference || "No Preference"}${trip.dietary ? " · " + trip.dietary : ""}`;
  document.getElementById("modalNotes").textContent =
    trip.notes || "No additional notes";

  document.getElementById("activityDate").value = trip.startDate;
  document.getElementById("activityDate").min = trip.startDate;
  document.getElementById("activityDate").max = trip.endDate;

  // Reset to first tab
  document
    .querySelectorAll(".tab-button")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  document.querySelector(".tab-button").classList.add("active");
  document.getElementById("overview").classList.add("active");

  displayActivities();
  displayAIItinerary();

  document.getElementById("tripModal").classList.add("active");
  document.body.style.overflow = "hidden";
  // Scroll modal content to top
  document.querySelector(".modal-content").scrollTop = 0;
}

export function closeModal() {
  document.getElementById("tripModal").classList.remove("active");
  document.body.style.overflow = "";
  setCurrentTripId(null);
  // Ensure trips section is visible — use navigateTo from window
  window.navigateTo("trips");
}

export function editTrip(tripId) {
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) return;

  document.getElementById("tripName").value = trip.name;
  document.getElementById("destination").value = trip.destination;
  document.getElementById("travelers").value = trip.travelers;
  document.getElementById("startDate").value = trip.startDate;
  document.getElementById("endDate").value = trip.endDate;
  document.getElementById("budget").value = trip.budget;
  document.getElementById("currency").value = trip.currency || "USD";
  document.getElementById("tripType").value = trip.tripType;
  document.getElementById("pace").value = trip.pace || "Moderate";
  document.getElementById("foodPreference").value = trip.foodPreference || "";
  document.getElementById("dietary").value = trip.dietary || "";
  document.getElementById("interests").value = trip.interests || "";
  document.getElementById("notes").value = trip.notes || "";

  // Remove old trip so submit creates a fresh one
  setTrips(trips.filter((t) => t.id !== tripId));
  saveTrips();

  closeModal();
  window.navigateTo("planner");
  showToast("Edit the details and re-submit to update your trip", "info", 4000);
}

export function deleteTrip() {
  if (!currentTripId) return;
  const trip = trips.find((t) => t.id === currentTripId);
  if (!trip) return;

  if (confirm(`Delete "${trip.name}"? This cannot be undone.`)) {
    setTrips(trips.filter((t) => t.id !== currentTripId));
    saveTrips();
    closeModal();
    displayTrips();
    showToast("Trip deleted", "info", 2500);
  }
}
