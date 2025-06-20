const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.set("io", io);

// ✅ Root test route
app.get("/", (req, res) => {
  res.send("Disaster Response API Running 🚀");
});

// ✅ Import routes
const disasterRoutes = require("./routes/disasters");
const geocodeRoute = require("./routes/geocode");
const socialMediaRoute = require("./routes/socialMedia");
const reportRoutes = require("./routes/reports");

// ✅ Mount routes
app.use("/disasters", disasterRoutes);         // All disaster-related routes
app.use("/geocode", geocodeRoute);             // Geolocation from OSM
app.use("/mock-social-media", socialMediaRoute); // Mock Twitter-like feed
app.use("/reports", reportRoutes);             // Reports handled separately

// ✅ Server start
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
