require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for WebSocket
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// WebSocket Connection
io.on("connection", (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`🔴 Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/resources", express.static(path.join(__dirname, "resources")));
app.set("io", io);

// Import Routes
const apiRoutes = require("./routes/api");
app.use(
  "/api",
  (req, res, next) => {
    req.io = io;
    next();
  },
  apiRoutes
);

const studentRoutes = require("./routes/studentRoutes");
app.use(
  "/api/students",
  (req, res, next) => {
    req.io = io;
    next();
  },
  studentRoutes
);

const staffRoutes = require("./routes/staffRoutes");
app.use("/api/staffs", staffRoutes);

const resourcesRoutes = require("./routes/resourcesRoutes");
app.use("/api/resources", resourcesRoutes);

const announcementRoutes = require("./routes/announcementRoutes");
app.use(
  "/api/announcements",
  (req, res, next) => {
    req.io = io;
    next();
  },
  announcementRoutes
);

const activityLogRoutes = require("./routes/activityLogRoutes");
app.use(
  "/api/activity-logs",
  (req, res, next) => {
    req.io = io;
    next();
  },
  activityLogRoutes
);

// Import Backlog Routes
const backlogRoutes = require("./routes/backlogRoutes");
app.use(
  "/api/backlogs",
  (req, res, next) => {
    req.io = io;
    next();
  },
  backlogRoutes
);

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
