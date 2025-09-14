require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require('./jobs');
const os = require("os");

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
const allowedOrigins = [
  'http://192.168.1.11:3001',
  'http://localhost:3001',
  'http://localhost:3000',        // ← ADD THIS IF NEEDED
  'http://192.168.1.11:3000'      // ← OR THIS
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}));

app.options('*', cors());

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
app.use(bodyParser.json());
app.use("/resources", express.static(path.join(__dirname, "resources")));
app.use('/public', express.static(path.join(__dirname, 'public')));
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

const moodRoutes = require("./routes/moodRoutes");
app.use("/api/moods", moodRoutes)

const chatbotRoutes = require('./routes/chatbotRoutes');
app.use('/api/chatbot', chatbotRoutes);

const studentActivityRoutes = require("./routes/studentActivityRoutes");
app.use( "/api/student-activities", studentActivityRoutes );

const studentLogInPercentageRoutes = require("./routes/studentLogInPercentageRoutes");
app.use( "/api/student-login-percentages", studentLogInPercentageRoutes );

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

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};


// Start server

server.listen(PORT, () => {
  console.log(`✅ Server running on http://${getLocalIP()}:${PORT}`);
});
