// routes/socialMedia.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  const mockPosts = [
    {
      post: "#floodrelief Need food in NYC",
      user: "citizen1"
    },
    {
      post: "Water rising fast in Anna Nagar! #urgent",
      user: "user77"
    },
    {
      post: "#earthquake Please help, stuck under debris in Kathmandu",
      user: "survivor99"
    }
  ];

  res.json(mockPosts);
});

module.exports = router;
