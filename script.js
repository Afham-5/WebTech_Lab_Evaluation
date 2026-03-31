// ==================== DATA MANAGEMENT ====================

// Initialize trips array from localStorage
let trips = JSON.parse(localStorage.getItem('trips')) || [];
let currentTripId = null;

// Save trips to localStorage
function saveTrips() {
    localStorage.setItem('trips', JSON.stringify(trips));
}

// ==================== NAVIGATION ====================

// Navigation between sections
function navigateTo(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }

    // Update nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    // Scroll to top
    window.scrollTo(0, 0);
}

// ==================== TRIP FORM HANDLING ====================

document.getElementById('tripForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Get form values
    const tripName = document.getElementById('tripName').value;
    const destination = document.getElementById('destination').value;
    const travelers = parseInt(document.getElementById('travelers').value);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const budget = parseFloat(document.getElementById('budget').value);
    const tripType = document.getElementById('tripType').value;
    const notes = document.getElementById('notes').value;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
        alert('End date must be after start date!');
        return;
    }

    // Create trip object
    const newTrip = {
        id: Date.now(),
        name: tripName,
        destination: destination,
        travelers: travelers,
        startDate: startDate,
        endDate: endDate,
        budget: budget,
        tripType: tripType,
        notes: notes,
        activities: [],
        createdDate: new Date().toISOString()
    };

    // Add to trips array
    trips.push(newTrip);
    saveTrips();

    // Reset form
    this.reset();

    // Show success message
    alert('Trip created successfully!');

    // Navigate to trips section
    navigateTo('trips');
    displayTrips();
});

// ==================== TRIP DISPLAY ====================

function displayTrips() {
    const tripsGrid = document.getElementById('tripsGrid');
    tripsGrid.innerHTML = '';

    if (trips.length === 0) {
        tripsGrid.innerHTML = '<div class="empty-state"><p>📋 No trips planned yet. <a href="#" onclick="navigateTo(\'planner\')">Create your first trip!</a></p></div>';
        return;
    }

    trips.forEach(trip => {
        const tripCard = createTripCard(trip);
        tripsGrid.appendChild(tripCard);
    });
}

function createTripCard(trip) {
    const card = document.createElement('div');
    card.className = 'trip-card';

    const status = getTripStatus(trip);
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const spent = calculateTripExpense(trip.id);

    card.innerHTML = `
        <div class="trip-card-header">
            <h3>${trip.name}</h3>
            <span class="trip-status ${status.class}">${status.text}</span>
        </div>
        <div class="trip-card-body">
            <div class="trip-info">
                <strong>📍</strong> ${trip.destination}
            </div>
            <div class="trip-info">
                <strong>📅</strong> ${duration} days
            </div>
            <div class="trip-info">
                <strong>👥</strong> ${trip.travelers} traveler(s)
            </div>
            <div class="trip-info">
                <strong>💰</strong> $${trip.budget.toFixed(2)} (Spent: $${spent.toFixed(2)})
            </div>
            <div class="trip-actions">
                <button onclick="openTripDetails(${trip.id})">View</button>
                <button onclick="editTrip(${trip.id})">Edit</button>
            </div>
        </div>
    `;

    return card;
}

function getTripStatus(trip) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(trip.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(trip.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (today < startDate) {
        return { text: 'Upcoming', class: 'status-upcoming' };
    } else if (today > endDate) {
        return { text: 'Completed', class: 'status-completed' };
    } else {
        return { text: 'Ongoing', class: 'status-ongoing' };
    }
}

function calculateTripDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

// ==================== TRIP DETAILS MODAL ====================

function openTripDetails(tripId) {
    currentTripId = tripId;
    const trip = trips.find(t => t.id === tripId);

    if (!trip) return;

    // Populate modal with trip details
    document.getElementById('modalTripName').textContent = trip.name;

    const status = getTripStatus(trip);
    document.getElementById('tripStatus').textContent = status.text;
    document.getElementById('tripStatus').className = `trip-status ${status.class}`;

    document.getElementById('modalDestination').textContent = trip.destination;
    const duration = calculateTripDays(trip.startDate, trip.endDate);
    document.getElementById('modalDuration').textContent = `${formatDate(trip.startDate)} to ${formatDate(trip.endDate)} (${duration} days)`;
    document.getElementById('modalTravelers').textContent = trip.travelers + ' traveler(s)';
    document.getElementById('modalBudget').textContent = '$' + trip.budget.toFixed(2);
    document.getElementById('modalType').textContent = trip.tripType;
    document.getElementById('modalNotes').textContent = trip.notes || 'No notes';

    // Update activity date input
    document.getElementById('activityDate').value = trip.startDate;

    // Display activities
    displayActivities();

    // Update budget tab
    updateBudgetInfo();

    // Show modal
    document.getElementById('tripModal').classList.add('active');
}

function closeModal() {
    document.getElementById('tripModal').classList.remove('active');
    currentTripId = null;
}

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const modal = document.getElementById('tripModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Close button
document.querySelector('.close').addEventListener('click', closeModal);

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// ==================== ACTIVITIES ====================

function addActivity() {
    if (!currentTripId) {
        alert('Please open a trip first');
        return;
    }

    const trip = trips.find(t => t.id === currentTripId);
    const activityDate = document.getElementById('activityDate').value;
    const activityName = document.getElementById('activityName').value;
    const activityCategory = document.getElementById('activityCategory').value;
    const activityTime = document.getElementById('activityTime').value;
    const activityCost = parseFloat(document.getElementById('activityCost').value) || 0;

    if (!activityName || !activityDate) {
        alert('Please fill in activity name and date');
        return;
    }

    // Validate date is within trip dates
    const actDate = new Date(activityDate);
    const tripStart = new Date(trip.startDate);
    const tripEnd = new Date(trip.endDate);

    if (actDate < tripStart || actDate > tripEnd) {
        alert(`Activity date must be between ${formatDate(trip.startDate)} and ${formatDate(trip.endDate)}`);
        return;
    }

    // Create activity
    const activity = {
        id: Date.now(),
        date: activityDate,
        name: activityName,
        category: activityCategory,
        time: activityTime || '09:00',
        cost: activityCost
    };

    // Add to trip
    trip.activities.push(activity);
    saveTrips();

    // Clear form
    document.getElementById('activityName').value = '';
    document.getElementById('activityTime').value = '';
    document.getElementById('activityCost').value = '';

    // Refresh display
    displayActivities();
    updateBudgetInfo();
}

function displayActivities() {
    const trip = trips.find(t => t.id === currentTripId);
    const activitiesList = document.getElementById('activitiesList');
    activitiesList.innerHTML = '';

    if (!trip || trip.activities.length === 0) {
        activitiesList.innerHTML = '<p style="text-align: center; color: var(--text-light);">No activities added yet</p>';
        return;
    }

    // Sort activities by date and time
    const sortedActivities = [...trip.activities].sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateA - dateB;
    });

    let currentDate = null;

    sortedActivities.forEach(activity => {
        // Add date header if date changed
        if (currentDate !== activity.date) {
            currentDate = activity.date;
            const dateHeader = document.createElement('h4');
            dateHeader.style.marginTop = '1.5rem';
            dateHeader.style.color = 'var(--primary-color)';
            dateHeader.textContent = formatDate(activity.date);
            activitiesList.appendChild(dateHeader);
        }

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-details">
                <span class="activity-category">${activity.category}</span>
                <div class="activity-name">${activity.name}</div>
                <div class="activity-time">⏰ ${activity.time}</div>
            </div>
            <div style="text-align: right;">
                <div class="activity-cost">$${activity.cost.toFixed(2)}</div>
                <button class="delete-btn" onclick="deleteActivity(${activity.id})">×</button>
            </div>
        `;
        activitiesList.appendChild(activityItem);
    });
}

function deleteActivity(activityId) {
    const trip = trips.find(t => t.id === currentTripId);
    trip.activities = trip.activities.filter(a => a.id !== activityId);
    saveTrips();
    displayActivities();
    updateBudgetInfo();
}

// ==================== BUDGET MANAGEMENT ====================

function calculateTripExpense(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return 0;
    return trip.activities.reduce((sum, activity) => sum + activity.cost, 0);
}

function updateBudgetInfo() {
    const trip = trips.find(t => t.id === currentTripId);
    if (!trip) return;

    const totalBudget = trip.budget;
    const spent = calculateTripExpense(currentTripId);
    const remaining = totalBudget - spent;
    const percentage = (spent / totalBudget) * 100;

    // Update budget stats
    document.getElementById('budgetTotal').textContent = '$' + totalBudget.toFixed(2);
    document.getElementById('budgetSpent').textContent = '$' + spent.toFixed(2);
    document.getElementById('budgetRemaining').textContent = '$' + Math.max(0, remaining).toFixed(2);

    // Update progress bar
    document.getElementById('budgetProgress').style.width = Math.min(percentage, 100) + '%';
    document.getElementById('budgetPercentage').textContent = Math.round(percentage) + '% of budget spent';

    // Update budget breakdown by category
    const budgetBreakdown = document.getElementById('budgetBreakdown');
    budgetBreakdown.innerHTML = '';

    const categoryTotals = {};
    trip.activities.forEach(activity => {
        if (!categoryTotals[activity.category]) {
            categoryTotals[activity.category] = 0;
        }
        categoryTotals[activity.category] += activity.cost;
    });

    Object.entries(categoryTotals).forEach(([category, amount]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-breakdown';
        categoryDiv.innerHTML = `
            <div class="category-name">${category}</div>
            <div class="category-amount">$${amount.toFixed(2)}</div>
        `;
        budgetBreakdown.appendChild(categoryDiv);
    });

    if (Object.keys(categoryTotals).length === 0) {
        budgetBreakdown.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light);">No expenses yet</p>';
    }
}

// ==================== TRIP EDIT & DELETE ====================

function editTrip(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    // Populate form with trip data
    document.getElementById('tripName').value = trip.name;
    document.getElementById('destination').value = trip.destination;
    document.getElementById('travelers').value = trip.travelers;
    document.getElementById('startDate').value = trip.startDate;
    document.getElementById('endDate').value = trip.endDate;
    document.getElementById('budget').value = trip.budget;
    document.getElementById('tripType').value = trip.tripType;
    document.getElementById('notes').value = trip.notes;

    // Delete old trip and save new one when form is submitted
    const originalSubmitHandler = document.getElementById('tripForm').onsubmit;
    trips = trips.filter(t => t.id !== tripId);
    saveTrips();

    // Close modal and navigate to planner
    closeModal();
    navigateTo('planner');
}

function deleteTrip() {
    if (!currentTripId) return;

    if (confirm('Are you sure you want to delete this trip? This cannot be undone.')) {
        trips = trips.filter(t => t.id !== currentTripId);
        saveTrips();
        closeModal();
        displayTrips();
        alert('Trip deleted successfully');
    }
}

// ==================== TAB SWITCHING ====================

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function() {
        const tabName = this.dataset.tab;

        // Remove active class from all buttons and contents
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        this.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// Set first tab as active by default
document.querySelector('.tab-button').classList.add('active');
document.querySelector('.tab-content').classList.add('active');

// ==================== INITIALIZATION ====================

// Set minimum start date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('startDate').min = today;
document.getElementById('endDate').min = today;

// Update minimum end date when start date changes
document.getElementById('startDate').addEventListener('change', function() {
    document.getElementById('endDate').min = this.value;
    if (document.getElementById('endDate').value < this.value) {
        document.getElementById('endDate').value = this.value;
    }
});

// Display trips on page load
displayTrips();

// Show home section by default
navigateTo('home');

// ==================== RESPONSIVE NAVIGATION ====================

const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', function() {
    navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
});

// Close menu when a link is clicked
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
        navMenu.style.display = 'none';
        const sectionId = this.dataset.section;
        navigateTo(sectionId);
    });
});

// ==================== UTILITY FUNCTIONS ====================

// Print trip itinerary
function printItinerary() {
    const trip = trips.find(t => t.id === currentTripId);
    if (!trip) return;

    const printWindow = window.open('', '_blank');
    let content = `<h1>${trip.name}</h1>
                   <p><strong>Destination:</strong> ${trip.destination}</p>
                   <p><strong>Date:</strong> ${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}</p>
                   <p><strong>Budget:</strong> $${trip.budget}</p>
                   <h2>Itinerary</h2>`;

    trip.activities.forEach(activity => {
        content += `<div>
                        <strong>${formatDate(activity.date)} - ${activity.time}</strong><br>
                        ${activity.name} (${activity.category}) - $${activity.cost}
                    </div>`;
    });

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
}

// Share trip (simulated)
function shareTrip() {
    const trip = trips.find(t => t.id === currentTripId);
    if (!trip) return;

    const tripSummary = `I'm planning a trip to ${trip.destination}! 
                        Dates: ${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}
                        Budget: $${trip.budget}
                        Travelers: ${trip.travelers}`;

    alert('Share this trip:\n\n' + tripSummary);
}
