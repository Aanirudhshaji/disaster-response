const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

// POST /disasters/:id/reports
router.post("/:id/reports", async (req, res) => {
  const { id: disaster_id } = req.params;
  const { user_id, content, image_url } = req.body;

  // Basic validation
  if (!user_id || !content) {
    return res.status(400).json({ error: "Missing user_id or content" });
  }

  const { data, error } = await supabase
    .from("reports")
    .insert([
      {
        disaster_id,
        user_id,
        content,
        image_url: image_url || null,
        verification_status: "pending"
      }
    ])
    .select();

  if (error) {
    console.error("Error saving report:", error);
    return res.status(500).json({ error: "Failed to save report" });
  }

  res.json({ message: "Report submitted", data });
});

module.exports = router;
