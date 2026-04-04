// ==================== DATA MANAGEMENT ====================

let trips = JSON.parse(localStorage.getItem("voyagr_trips")) || [];
let currentTripId = null;
let currentFilter = "all";

function saveTrips() {
  localStorage.setItem("voyagr_trips", JSON.stringify(trips));
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = "info", duration = 3500) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), duration);
}

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

  // Close mobile menu
  document.querySelector(".nav-menu").classList.remove("open");
}

// ==================== HAMBURGER MENU ====================

document.getElementById("hamburger").addEventListener("click", () => {
  document.querySelector(".nav-menu").classList.toggle("open");
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo(link.dataset.section);
  });
});

// ==================== HERO STATS ====================

function updateHeroStats() {
  const el = document.getElementById("statTrips");
  if (el) el.textContent = trips.length;
}

// ==================== TRIP FORM ====================

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
      // Navigate to trips and auto-open the itinerary
      navigateTo("trips");
      displayTrips();
      openTripDetails(newTrip.id);
      // Switch to AI Itinerary tab
      setTimeout(() => {
        document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
        document.querySelector('[data-tab="ai-itinerary"]').classList.add("active");
        document.getElementById("ai-itinerary").classList.add("active");
      }, 100);
    } catch (err) {
      console.error("Itinerary generation error:", err);
      // Trip is already saved; notify user
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

// ==================== TRIP DISPLAY ====================

function displayTrips() {
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

function getTripStatus(trip) {
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

// ==================== TRIPS FILTER ====================

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    displayTrips();
  });
});

// ==================== TRIP DETAILS MODAL ====================

function openTripDetails(tripId) {
  currentTripId = tripId;
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
  updateBudgetInfo();

  document.getElementById("tripModal").classList.add("active");
  document.body.style.overflow = "hidden";
  // Scroll modal content to top
  document.querySelector(".modal-content").scrollTop = 0;
}

function closeModal() {
  document.getElementById("tripModal").classList.remove("active");
  document.body.style.overflow = "";
  currentTripId = null;
  // Ensure trips section is visible
  navigateTo("trips");
}

// ==================== TABS ====================

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

// ==================== ACTIVITIES ====================

function addActivity() {
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
  updateBudgetInfo();
  showToast("Activity added!", "success", 2000);
}

function displayActivities() {
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

function deleteActivity(activityId) {
  const trip = trips.find((t) => t.id === currentTripId);
  trip.activities = trip.activities.filter((a) => a.id !== activityId);
  saveTrips();
  displayActivities();
  updateBudgetInfo();
  showToast("Activity removed", "info", 2000);
}

// ==================== AI ITINERARY DISPLAY ====================

function displayAIItinerary() {
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

function toggleDay(header) {
  const body = header.nextElementSibling;
  const chevron = header.querySelector(".day-chevron");
  const isOpen = body.classList.toggle("open");
  if (chevron) chevron.classList.toggle("open", isOpen);
}

// ==================== REGENERATE ITINERARY ====================

async function regenerateItinerary() {
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

// ==================== BUDGET ====================

function calcExpense(tripId) {
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) return 0;
  return trip.activities.reduce((sum, a) => sum + a.cost, 0);
}

function updateBudgetInfo() {
  const trip = trips.find((t) => t.id === currentTripId);
  if (!trip) return;

  const sym = getCurrencySymbol(trip.currency);
  const total = trip.budget;
  const spent = calcExpense(currentTripId);
  const remaining = total - spent;
  const pct = total > 0 ? (spent / total) * 100 : 0;

  document.getElementById("budgetTotal").textContent =
    sym + total.toLocaleString();
  document.getElementById("budgetSpent").textContent =
    sym + spent.toLocaleString();
  document.getElementById("budgetRemaining").textContent =
    sym + Math.max(0, remaining).toLocaleString();
  document.getElementById("budgetProgress").style.width =
    Math.min(pct, 100) + "%";
  document.getElementById("budgetProgress").style.background =
    pct > 90
      ? "var(--danger)"
      : pct > 70
        ? "var(--gold)"
        : "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)";
  document.getElementById("budgetPercentage").textContent =
    `${Math.round(pct)}% of budget used`;

  const bd = document.getElementById("budgetBreakdown");
  bd.innerHTML = "";
  const cats = {};
  trip.activities.forEach((a) => {
    cats[a.category] = (cats[a.category] || 0) + a.cost;
  });

  if (Object.keys(cats).length === 0) {
    bd.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:1rem 0;">No expenses yet</p>';
    return;
  }
  Object.entries(cats).forEach(([cat, amt]) => {
    const d = document.createElement("div");
    d.className = "category-breakdown";
    d.innerHTML = `<div class="category-name">${cat}</div><div class="category-amount">${sym}${amt.toLocaleString()}</div>`;
    bd.appendChild(d);
  });
}

// ==================== EDIT & DELETE ====================

function editTrip(tripId) {
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
  trips = trips.filter((t) => t.id !== tripId);
  saveTrips();

  closeModal();
  navigateTo("planner");
  showToast("Edit the details and re-submit to update your trip", "info", 4000);
}

function deleteTrip() {
  if (!currentTripId) return;
  const trip = trips.find((t) => t.id === currentTripId);
  if (!trip) return;

  if (confirm(`Delete "${trip.name}"? This cannot be undone.`)) {
    trips = trips.filter((t) => t.id !== currentTripId);
    saveTrips();
    closeModal();
    displayTrips();
    showToast("Trip deleted", "info", 2500);
  }
}

// ==================== PRINT / SHARE ====================

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

function printItinerary() {
  const trip = trips.find((t) => t.id === currentTripId);
  if (!trip) return;
  const win = window.open("", "_blank");
  win.document.write(buildItineraryHTML(trip));
  win.document.close();
  win.print();
}

async function shareTrip() {
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

// ==================== GEMINI AI INTEGRATION ====================

const GEMINI_API_KEY = "YOUR API KEY";

async function generateTravelItinerary(trip, days) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("Please add your Gemini API key at the top of script.js");
  }

  const sym = getCurrencySymbol(trip.currency);
  const dailyBudget = (trip.budget / days).toFixed(2);

  // Sanitize trip data to prevent quote/escape issues in prompt
  const sanitize = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\") // Escape backslashes first
      .replace(/"/g, '\\"') // Escape quotes
      .replace(/\n/g, " ") // Replace newlines with space
      .trim();
  };

  // For long trips, ask for concise output to avoid token limits
  const isLongTrip = days > 7;
  const activitiesPerDay = isLongTrip ? "3-4" : "4-6";
  const conciseNote = isLongTrip
    ? "\nCRITICAL: This is a long trip. Keep descriptions SHORT (1 sentence max). Keep tips SHORT (under 10 words). Keep meal recommendations to just the name. Do NOT be verbose — brevity is essential to fit within response limits."
    : "";

  // Gemini uses a single "contents" array — we combine system instructions
  // and the user request into one user turn (the simplest reliable approach).
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

  // Use gemini-2.5-flash for better JSON handling
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 65536,
        responseMimeType: "application/json",
      },
    }),
  });
  console.log(response);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || response.statusText;

    alert(msg);
    if (response.status === 400)
      throw new Error("Invalid API key or request. Check your Gemini API key.");
    if (response.status === 429)
      throw new Error(
        "Rate limit reached. Please wait a moment and try again.",
      );
    throw new Error(`Gemini API error ${response.status}: ${msg}`);
  }

  const data = await response.json();

  // Extract text from Gemini response structure
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText)
    throw new Error("Empty response from Gemini. Please try again.");

  // Robust JSON parsing with error diagnostics
  let cleaned = rawText
    .replace(/^```json\s*/i, "") // Remove markdown start
    .replace(/\s*```$/i, "") // Remove markdown end
    .trim();

  // Try to find and extract JSON
  let jsonObj;
  try {
    // First try direct parse (if response is pure JSON)
    jsonObj = JSON.parse(cleaned);
  } catch (e1) {
    // If direct parse fails, try to repair truncated JSON
    try {
      const start = cleaned.indexOf("{");
      if (start === -1) {
        throw new Error("No JSON object found in response");
      }

      let jsonStr = cleaned.substring(start);

      // Attempt to repair truncated JSON by closing unclosed brackets
      jsonStr = repairTruncatedJSON(jsonStr);
      jsonObj = JSON.parse(jsonStr);
      console.warn("Parsed repaired (truncated) JSON — some days may be missing.");
    } catch (e2) {
      console.error("Raw response:", cleaned);
      console.error("JSON parse error:", e2.message);

      throw new Error(
        `Failed to parse Gemini response as JSON: ${e2.message}. Response starts with: ${cleaned.substring(0, 200)}`,
      );
    }
  }

  return jsonObj;
}

/**
 * Attempts to repair truncated JSON by closing any unclosed brackets/braces.
 * This handles the case where Gemini runs out of tokens mid-response.
 */
function repairTruncatedJSON(json) {
  // Track open brackets and braces
  let inString = false;
  let escaped = false;
  const stack = [];

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
    } else if (ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
    }
  }

  // If we were inside a string when truncated, close the string
  if (inString) {
    json += '"';
  }

  // Find the last valid position — trim trailing incomplete key-value pairs
  // Look for the last complete value (ends with }, ], number, "string", true, false, null)
  let trimmed = json;
  if (stack.length > 0) {
    // Remove any trailing partial content after the last comma or complete value
    const lastGoodComma = Math.max(
      trimmed.lastIndexOf(","),
      trimmed.lastIndexOf("}"),
      trimmed.lastIndexOf("]"),
    );
    if (lastGoodComma > 0) {
      const after = trimmed.substring(lastGoodComma);
      // If the last significant char is a comma, remove it (dangling comma)
      if (trimmed[lastGoodComma] === ",") {
        trimmed = trimmed.substring(0, lastGoodComma);
      }
    }
  }

  // Close all unclosed brackets in reverse order
  // Re-calculate stack after trimming
  const finalStack = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") finalStack.push(ch);
    else if (ch === "}" && finalStack.length && finalStack[finalStack.length - 1] === "{") finalStack.pop();
    else if (ch === "]" && finalStack.length && finalStack[finalStack.length - 1] === "[") finalStack.pop();
  }

  // Close remaining open brackets
  let suffix = "";
  while (finalStack.length > 0) {
    const open = finalStack.pop();
    suffix += open === "{" ? "}" : "]";
  }

  return trimmed + suffix;
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calcDays(start, end) {
  return (
    Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1
  );
}

function getCurrencySymbol(code) {
  const map = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return map[code] || "$";
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ==================== INIT ====================

(function init() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("startDate").min = today;
  document.getElementById("endDate").min = today;

  document.getElementById("startDate").addEventListener("change", function () {
    document.getElementById("endDate").min = this.value;
    if (document.getElementById("endDate").value < this.value) {
      document.getElementById("endDate").value = this.value;
    }
  });

  navigateTo("home");
  updateHeroStats();
})();
