const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.set("io", io);

// 🔽 This route must be defined
app.get("/", (req, res) => {
  res.send("Disaster Response API Running 🚀");
});

// Routes
const disasterRoutes = require("./routes/disasters");
const geocodeRoute = require("./routes/geocode");
const socialMediaRoute = require("./routes/socialMedia");
const reportRoutes = require("./routes/reports");

app.use("/disasters", disasterRoutes);
app.use("/geocode", geocodeRoute);
app.use("/mock-social-media", socialMediaRoute);
app.use("/disasters", reportRoutes);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
