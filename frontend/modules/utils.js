// ==================== UTILITY FUNCTIONS ====================

export function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function calcDays(start, end) {
  return (
    Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1
  );
}

export function getCurrencySymbol(code) {
  const map = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return map[code] || "$";
}

export function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function showToast(message, type = "info", duration = 3500) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), duration);
}
