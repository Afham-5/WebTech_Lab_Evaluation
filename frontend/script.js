// ==================== MAIN ENTRY POINT ====================
// Loads components, imports modules, wires up event listeners

import { loadComponents } from "./modules/loader.js";
import { trips, setCurrentFilter, saveTrips } from "./modules/store.js";
import { showToast } from "./modules/utils.js";
import { displayTrips } from "./modules/trips.js";
import { generateTravelItinerary } from "./modules/api.js";
import { openTripDetails, closeModal, editTrip, deleteTrip } from "./modules/modal.js";
import { addActivity, deleteActivity } from "./modules/activities.js";
import { toggleDay, regenerateItinerary } from "./modules/itinerary.js";
import { printItinerary, shareTrip } from "./modules/share.js";

// ==================== EXPOSE GLOBALS FIRST ====================
// Functions called via onclick="" in HTML need to be on window
// These must be set before components are loaded

window.navigateTo = navigateTo;
window.openTripDetails = openTripDetails;
window.closeModal = closeModal;
window.editTrip = editTrip;
window.deleteTrip = deleteTrip;
window.addActivity = addActivity;
window.deleteActivity = deleteActivity;
window.toggleDay = toggleDay;
window.regenerateItinerary = regenerateItinerary;
window.printItinerary = printItinerary;
window.shareTrip = shareTrip;

// ==================== LOAD COMPONENTS & INIT ====================

await loadComponents();
initApp();

// ==================== NAVIGATION ====================

function navigateTo(sectionId) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((l) => {
    l.classList.remove("active");
    if (l.dataset.section === sectionId) l.classList.add("active");
  });

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (sectionId === "trips") displayTrips();
  if (sectionId === "home") updateHeroStats();

  document.querySelector(".nav-menu").classList.remove("open");
}

function updateHeroStats() {
  const el = document.getElementById("statTrips");
  if (el) el.textContent = trips.length;
}

// ==================== APP INIT ====================

function initApp() {
  // Hamburger menu
  document.getElementById("hamburger").addEventListener("click", () => {
    document.querySelector(".nav-menu").classList.toggle("open");
  });

  // Nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  });

  // Trip filters
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      setCurrentFilter(btn.dataset.filter);
      displayTrips();
    });
  });

  // Tabs
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".tab-button")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(this.dataset.tab).classList.add("active");
    });
  });

  // Date constraints
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("startDate").min = today;
  document.getElementById("endDate").min = today;

  document.getElementById("startDate").addEventListener("change", function () {
    document.getElementById("endDate").min = this.value;
    if (document.getElementById("endDate").value < this.value) {
      document.getElementById("endDate").value = this.value;
    }
  });

  // Trip form submission
  document
    .getElementById("tripForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const tripName = document.getElementById("tripName").value.trim();
      const destination = document.getElementById("destination").value.trim();
      const travelers = parseInt(document.getElementById("travelers").value);
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
      const budget = parseFloat(document.getElementById("budget").value);
      const currency = document.getElementById("currency").value;
      const tripType = document.getElementById("tripType").value;
      const pace = document.getElementById("pace").value;
      const foodPreference = document.getElementById("foodPreference").value;
      const dietary = document.getElementById("dietary").value.trim();
      const interests = document.getElementById("interests").value.trim();
      const notes = document.getElementById("notes").value.trim();

      if (new Date(startDate) > new Date(endDate)) {
        showToast("End date must be after start date!", "error");
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const newTrip = {
        id: Date.now(),
        name: tripName,
        destination,
        travelers,
        startDate,
        endDate,
        budget,
        currency,
        tripType,
        pace,
        foodPreference,
        dietary,
        interests,
        notes,
        activities: [],
        itinerary: null,
        createdDate: new Date().toISOString(),
      };

      trips.push(newTrip);
      saveTrips();

      // Button loading state
      const btn = document.getElementById("submitBtn");
      const btnText = btn.querySelector(".btn-text");
      const btnLoad = btn.querySelector(".btn-loader");
      btn.disabled = true;
      btnText.style.display = "none";
      btnLoad.style.display = "inline-flex";

      showToast("✈️ Generating your AI itinerary…", "info", 60000);

      try {
        const itinerary = await generateTravelItinerary(newTrip, days);
        newTrip.itinerary = itinerary;
        saveTrips();
        this.reset();
        showToast("🎉 Trip created & itinerary ready!", "success");
        navigateTo("trips");
        displayTrips();
        openTripDetails(newTrip.id);
        setTimeout(() => {
          document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
          document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
          document.querySelector('[data-tab="ai-itinerary"]').classList.add("active");
          document.getElementById("ai-itinerary").classList.add("active");
        }, 100);
      } catch (err) {
        console.error("Itinerary generation error:", err);
        showToast(
          "Trip saved, but itinerary generation failed. You can regenerate from the trip view.",
          "error",
          5000,
        );
        this.reset();
        navigateTo("trips");
        displayTrips();
        openTripDetails(newTrip.id);
      } finally {
        btn.disabled = false;
        btnText.style.display = "inline";
        btnLoad.style.display = "none";
      }
    });

  // Start on home
  navigateTo("home");
  updateHeroStats();
}
