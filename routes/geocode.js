// routes/geocode.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

// POST /geocode
// Input: { "location": "Anna Nagar, Chennai" }
// Output: { "lat": "13.0827", "lon": "80.2707" }
router.post("/", async (req, res) => {
  const { location } = req.body;

  if (!location) {
    return res.status(400).json({ error: "Location is required" });
  }

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: location,
        format: "json",
        limit: 1
      },
      headers: {
        "User-Agent": "DisasterResponseApp/1.0"
      }
    });

    const result = response.data[0];

    if (!result) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json({ lat: result.lat, lon: result.lon });
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "Failed to fetch coordinates" });
  }
});

module.exports = router;
