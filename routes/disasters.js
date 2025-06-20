const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const { extractLocation } = require("../services/geminiService");
const axios = require("axios");
const cheerio = require("cheerio");

const PRIORITY_KEYWORDS = ["urgent", "sos", "emergency", "help"];
const isPriority = (text) => PRIORITY_KEYWORDS.some(k => text.toLowerCase().includes(k));

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

  if (error || !disaster) return res.status(404).json({ error: "Disaster not found" });

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

// GET /disasters/:id/official-updates (NDMA with cache)
router.get("/:id/official-updates", async (req, res) => {
  const cacheKey = "ndma-updates";
  const now = new Date().toISOString();

  const { data: cached } = await supabase
    .from("cache")
    .select("*")
    .eq("key", cacheKey)
    .gt("expires_at", now)
    .maybeSingle();

  if (cached?.value) {
    return res.json({ source: "cache", data: cached.value });
  }

  try {
    const response = await axios.get("https://ndma.gov.in");
    const html = response.data;
    const $ = cheerio.load(html);
    const updates = [];

    $(".view-announcements .views-row").each((_, el) => {
      const update = $(el).text().trim().replace(/\s+/g, " ");
      if (update) updates.push({ source: "NDMA", update });
    });

    if (updates.length === 0) {
      updates.push({ source: "NDMA", update: "No official updates available currently." });
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from("cache").upsert({ key: cacheKey, value: updates, expires_at: expiresAt });

    res.json({ source: "fresh", data: updates });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch official updates" });
  }
});

// ✅ POST /disasters/:id/verify-image (Image Verification)
router.post("/:id/verify-image", async (req, res) => {
  const { id } = req.params;
  const { image_url } = req.body;

  if (!image_url) return res.status(400).json({ error: "Missing image_url" });

  try {
    const imgRes = await axios.get(image_url, {
      responseType: "arraybuffer",
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const imageBase64 = Buffer.from(imgRes.data).toString("base64");

    const geminiResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: "Analyze this image and tell if it is a real disaster scenario (like flood, fire, etc.)"
              },
              {
                image: {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64
                  }
                }
              }
            ]
          }
        ]
      },
      {
        params: { key: process.env.GEMINI_API_KEY },
        headers: { "Content-Type": "application/json" }
      }
    );

    const result =
      geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No AI response";

    res.json({ message: "Image analyzed", result });
  } catch (err) {
    console.error("Image verification error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Image verification failed", details: err.message });
  }
});

module.exports = router;
