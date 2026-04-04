import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { generateItinerary, healthCheck } from "./controllers/itineraryController.js";

// Load .env from project root (one level up from backend/)
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Validate API key on startup
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not found in .env file!");
  process.exit(1);
}

// ==================== ROUTES ====================

app.post("/api/generate-itinerary", generateItinerary);
app.get("/api/health", healthCheck);

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`\n🚀 Voyagr Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/generate-itinerary`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health\n`);
});
