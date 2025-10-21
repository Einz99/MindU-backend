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
const PORT = process.env.PORT;

// Create HTTP server for WebSocket
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  } 
});

// Store active sessions
let activeSessions = {};

// Middleware
const allowedOrigins = [
  'http://192.168.1.6:3001',
  'http://localhost:3001',
  'http://localhost:3000',
  'http://192.168.1.6:3000',
  '*'
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

const backlogRoutes = require("./routes/backlogRoutes");
app.use(
  "/api/backlogs",
  (req, res, next) => {
    req.io = io;
    next();
  },
  backlogRoutes
);

const chatbotRoutes = require('./routes/chatbotRoutes');
app.use('/api/chatbot', (req, res, next) => {
  req.io = io;
  next();
}, chatbotRoutes);

const petRoutes = require("./routes/petRoutes");
app.use("/api/pets", (req, res, next) => {
  req.io = io;
  next();
}, petRoutes);

// SINGLE WebSocket Connection Handler
io.on("connection", (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`);

  // When a student joins the chat
  socket.on('join-chat', (student_id) => {
    const roomName = `student-${student_id}`;
    socket.join(roomName);
    activeSessions[student_id] = { 
      socketId: socket.id, 
      isAgentAvailable: false,
      roomName: roomName
    };
    console.log(`Student ${student_id} joined room: ${roomName}`);
  });

  // When an agent accepts a chat (joins the student's room)
  socket.on('join-agent', (student_id) => {
    const roomName = `student-${student_id}`;
    socket.join(roomName);
    
    if (activeSessions[student_id]) {
      activeSessions[student_id].isAgentAvailable = true;
      activeSessions[student_id].agentSocketId = socket.id;
    }
    
    console.log(`Agent joined room: ${roomName} for student ${student_id}`);
    
    // Notify the student that agent is available
    io.to(roomName).emit('join-agent', { 
      isAgentAvailable: true,
      student_id: student_id 
    });
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log(`🔴 Client disconnected: ${socket.id}`);
    
    // Find and clean up the session
    for (const [student_id, session] of Object.entries(activeSessions)) {
      if (session.socketId === socket.id || session.agentSocketId === socket.id) {
        console.log(`Cleaning up session for student ${student_id}`);
        // Don't delete immediately - allow reconnection
        setTimeout(() => {
          if (activeSessions[student_id] && 
              (activeSessions[student_id].socketId === socket.id || 
               activeSessions[student_id].agentSocketId === socket.id)) {
            delete activeSessions[student_id];
            console.log(`Session deleted for student ${student_id}`);
          }
        }, 5000); // 5 second grace period for reconnection
        break;
      }
    }
  });
});

// Test endpoint
app.get('/test', (req, res) => {
    console.log('Received request for /test');
    res.send('Connected successfully');
});

app.post('/toggle-pet-sleep', async (req, res) => {
    const { petId, isSleeping } = req.body;

    try {
        console.log(`Received sleep status update for pet ${petId}: ${isSleeping ? "Sleeping" : "Awake"}`);

        // Update the pet's sleep state in memory or database
        if (isSleeping) {
            // Add to sleepingPets in memory
            sleepingPets[petId] = true;
        } else {
            // Remove from sleepingPets in memory
            delete sleepingPets[petId];
        }

        // Respond back to Unity
        res.status(200).send({ message: 'Sleep status updated successfully' });
    } catch (error) {
        console.error('Error updating sleep status:', error.message);
        res.status(500).send({ message: 'Error updating sleep status' });
    }
});

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