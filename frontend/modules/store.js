// ==================== DATA STORE ====================
// Centralized state management for trips

export let trips = JSON.parse(localStorage.getItem("voyagr_trips")) || [];
export let currentTripId = null;
export let currentFilter = "all";

export function setTrips(newTrips) {
  trips = newTrips;
}

export function setCurrentTripId(id) {
  currentTripId = id;
}

export function setCurrentFilter(filter) {
  currentFilter = filter;
}

export function saveTrips() {
  localStorage.setItem("voyagr_trips", JSON.stringify(trips));
}
