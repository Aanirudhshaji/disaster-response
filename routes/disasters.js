const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const { extractLocation } = require("../services/geminiService");
const axios = require("axios");
const cheerio = require("cheerio");

// Priority alert keywords
const PRIORITY_KEYWORDS = ["urgent", "sos", "emergency", "help"];

// Utility function for priority detection
const isPriority = (text) =>
  PRIORITY_KEYWORDS.some(k => text.toLowerCase().includes(k));

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

// PUT /disasters/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, tags, location_name, user_id } = req.body;

  const result = await supabase.from("disasters").select("audit_trail").eq("id", id).single();
  let audit = result.data?.audit_trail || [];
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

// POST /disasters/:id/reports
router.post("/:id/reports", async (req, res) => {
  const { id: disaster_id } = req.params;
  const { user_id, content, image_url } = req.body;

  const priority = isPriority(content) ? "high" : "normal";

  const { data, error } = await supabase
    .from("reports")
    .insert([{ disaster_id, user_id, content, image_url, verification_status: "pending", priority }])
    .select();

  if (error) return res.status(500).json({ error: "Failed to save report" });

  res.json({ message: "Report submitted", data });
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
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }

  const mockTweets = [
    { user: "citizen1", post: "#floodrelief Need water in NYC" },
    { user: "relief_bot", post: "Shelter open in Kannur" },
    { user: "survivor77", post: "#earthquake Stuck in rubble, help" },
    { user: "ngo_alert", post: "Urgent #flood help needed in Chennai" },
    { user: "watcher", post: "Just watching #storm" }
  ];

  const lowerTags = tags.map(t => t.toLowerCase());

  const filtered = mockTweets
    .filter(tweet => lowerTags.some(tag => tweet.post.toLowerCase().includes(tag)))
    .map(tweet => ({
      ...tweet,
      priority: isPriority(tweet.post) ? "high" : "normal"
    }));

  res.json(filtered.length ? filtered : [{ user: "system", post: "No matching social media posts." }]);
});

// GET /disasters/:id/external-resources (Nearby hospitals using Overpass API)
router.get("/:id/external-resources", async (req, res) => {
  const { id } = req.params;

  const { data: disaster, error } = await supabase
    .from("disasters")
    .select("latitude, longitude")
    .eq("id", id)
    .single();

  if (error || !disaster) return res.status(404).json({ error: "Disaster not found" });

  if (!disaster.latitude || !disaster.longitude) {
    return res.status(400).json({ error: "Invalid coordinates for this disaster" });
  }

  const query = `
    [out:json];
    (
      node["amenity"="hospital"](around:10000,${disaster.latitude},${disaster.longitude});
      way["amenity"="hospital"](around:10000,${disaster.latitude},${disaster.longitude});
    );
    out center;
  `;

  try {
    const response = await axios.post("https://overpass-api.de/api/interpreter", query, {
      headers: { "Content-Type": "text/plain" }
    });

    const results = response.data?.elements?.map(el => ({
      name: el.tags?.name || "Unnamed Hospital",
      lat: el.lat || el.center?.lat,
      lon: el.lon || el.center?.lon
    }));

    res.json({ hospitals: results?.length ? results : [{ name: "No hospitals found", lat: null, lon: null }] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hospital data" });
  }
});

module.exports = router;
