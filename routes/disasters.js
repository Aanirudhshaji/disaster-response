const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const { extractLocation } = require("../services/geminiService");
const axios = require("axios");
const cheerio = require("cheerio");

// POST /disasters
router.post("/", async (req, res) => {
  const { title, location_name, description, tags, owner_id } = req.body;

  const { data, error } = await supabase
    .from("disasters")
    .insert([{ title, location_name, description, tags, owner_id }]);

  if (error) return res.status(500).json({ error: "Database insert failed" });

  req.app.get("io").emit("disaster_updated", data);
  res.json(data);
});

// GET /disasters
router.get("/", async (req, res) => {
  const { tag } = req.query;
  let query = supabase.from("disasters").select("*").order("created_at", { ascending: false });
  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: "Failed to fetch disasters" });

  res.json(data);
});

// DELETE /disasters/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("disasters").delete().eq("id", id);
  if (error) return res.status(500).json({ error: "Failed to delete disaster" });

  req.app.get("io").emit("disaster_updated", { deleted_id: id });
  res.json({ message: "Disaster deleted", id });
});

// PUT /disasters/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, tags, location_name, user_id } = req.body;

  const fetchResult = await supabase.from("disasters").select("audit_trail").eq("id", id).single();
  let audit = fetchResult.data?.audit_trail || [];
  audit.push({ action: "update", user_id, timestamp: new Date().toISOString() });

  const { data, error } = await supabase
    .from("disasters")
    .update({ title, description, tags, location_name, audit_trail: audit })
    .eq("id", id)
    .select();

  if (error) return res.status(500).json({ error: "Failed to update disaster" });

  req.app.get("io").emit("disaster_updated", data);
  res.json({ message: "Disaster updated", data });
});

// POST /disasters/extract-location
router.post("/extract-location", async (req, res) => {
  try {
    const { description } = req.body;
    const location = await extractLocation(description);
    res.json({ location });
  } catch (err) {
    res.status(500).json({ error: "Gemini AI failed to extract location", details: err.message });
  }
});

// POST /disasters/auto-create
router.post("/auto-create", async (req, res) => {
  const { title, description, tags, owner_id } = req.body;
  try {
    const location_name = await extractLocation(description);
    const geoRes = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: location_name, format: "json", limit: 1 },
      headers: { "User-Agent": "DisasterResponseApp/1.0" }
    });

    const result = geoRes.data[0];
    if (!result) return res.status(404).json({ error: "Geocoding failed" });

    const { lat: latitude, lon: longitude } = result;
    const { data, error } = await supabase
      .from("disasters")
      .insert([{ title, description, tags, location_name, latitude, longitude, location: `POINT(${longitude} ${latitude})`, owner_id }])
      .select();

    if (error) return res.status(500).json({ error: "Failed to save disaster" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to auto-create disaster", details: err.message });
  }
});

// POST /disasters/:id/resources
router.post("/:id/resources", async (req, res) => {
  const { id: disaster_id } = req.params;
  const { name, type, location_name, latitude, longitude } = req.body;

  if (!name || !type || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("resources")
    .insert([
      { disaster_id, name, type, location_name, location: `POINT(${longitude} ${latitude})` }
    ])
    .select();

  if (error) {
    console.error("Insert resource error:", error);
    return res.status(500).json({ error: "Failed to save resource" });
  }

  req.app.get("io").emit("resources_updated", data);
  res.json({ message: "Resource added", data });
});

// GET /disasters/:id/resources?lat=...&lon=...
router.get("/:id/resources", async (req, res) => {
  const { id } = req.params;
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon query params" });
  }

  const { data, error } = await supabase.rpc("get_nearby_resources", {
    disasterid: id,
    center_lat: parseFloat(lat),
    center_lon: parseFloat(lon),
    radius_km: 10
  });

  if (error) {
    console.error("Geospatial query error:", error);
    return res.status(500).json({ error: "Failed to fetch nearby resources" });
  }

  res.json(data);
});

// GET /disasters/:id/social-media
router.get("/:id/social-media", async (req, res) => {
  const { id } = req.params;

  const { data: disaster, error } = await supabase
    .from("disasters")
    .select("tags")
    .eq("id", id)
    .single();

  if (error || !disaster) {
    return res.status(404).json({ error: "Disaster not found" });
  }

  let tags = disaster.tags || [];

  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = [];
    }
  }

  const mockTweets = [
    { user: "citizen1", post: "#floodrelief Need water in NYC" },
    { user: "relief_bot", post: "Shelter open in Kannur" },
    { user: "survivor77", post: "#earthquake Stuck in rubble, help" },
    { user: "ngo_alert", post: "Urgent #flood help needed in Chennai" },
    { user: "watcher", post: "Just watching #storm" }
  ];

  const lowerTags = tags.map(t => t.toLowerCase());

  const filtered = mockTweets.filter(tweet =>
    lowerTags.some(tag => tweet.post.toLowerCase().includes(tag))
  );

  res.json(filtered.length ? filtered : [{ user: "system", post: "No matching social media posts." }]);
});

// GET /disasters/:id/official-updates (with caching)
router.get("/:id/official-updates", async (req, res) => {
  const cacheKey = "ndma-updates";
  const now = new Date().toISOString();

  const { data: cached, error: cacheErr } = await supabase
    .from("cache")
    .select("*")
    .eq("key", cacheKey)
    .gt("expires_at", now)
    .maybeSingle();

  if (cached && cached.value) {
    return res.json({ source: "cache", data: cached.value });
  }

  try {
    const response = await axios.get("https://ndma.gov.in");
    const html = response.data;
    const $ = cheerio.load(html);
    const updates = [];

    $(".view-announcements .views-row").each((i, el) => {
      const update = $(el).text().trim().replace(/\s+/g, " ");
      if (update) updates.push({ source: "NDMA", update });
    });

    if (updates.length === 0) {
      updates.push({ source: "NDMA", update: "No official updates available currently." });
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase
      .from("cache")
      .upsert({ key: cacheKey, value: updates, expires_at: expiresAt });

    res.json({ source: "fresh", data: updates });
  } catch (err) {
    console.error("Scraping error:", err.message);
    res.status(500).json({ error: "Failed to fetch official updates" });
  }
});

module.exports = router;
