require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require('./jobs');
require('./petJobs');
const os = require("os");

const app = express();
const PORT = process.env.PORT;

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
  'http://192.168.1.6:3001',
  'http://localhost:3001',
  'http://localhost:3000',        // ← ADD THIS IF NEEDED
  'http://192.168.1.6:3000',      // ← OR THIS
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

const chatbotRoutes = require('./routes/chatbotRoutes');
app.use('/api/chatbot', (req, res, next) => {
  req.io = io;  // Make `io` available to the route handlers
  next();
}, chatbotRoutes);

const petRoutes = require("./routes/petRoutes");
app.use("/api/pets", (req, res, next) => {
  req.io = io;
  next();
}, petRoutes);

let activeSessions = {}; // Store active sessions
let reconnectAttempts = {}; // Track the number of reconnection attempts for each user

// Maximum reconnection attempts
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000; // Delay between reconnection attempts in milliseconds

// WebSocket Connection
io.on("connection", (socket) => {
    console.log(`🟢 Client connected: ${socket.id}`);

    // Reset reconnection attempts when a new connection is made
    reconnectAttempts[socket.id] = 0;

    // Handle student/counselor joining the chat
    socket.on('join-chat', (userId) => {
        activeSessions[userId] = socket.id; // Map user to socket ID
        console.log(`User ${userId} joined with socket ${socket.id}`);

        // Emit to the user if an agent is available
        if (activeSessions[userId].isAgentAvailable) {
            socket.emit('agent-available', { isAgentAvailable: true });
        }
    });

    // When the agent accepts the chat, notify the student
    socket.on('accept-chat', (userId) => {
        if (activeSessions[userId]) {
            io.to(activeSessions[userId]).emit('agent-available', { isAgentAvailable: true });
            console.log(`Agent accepted chat for user ${userId}`);
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log(`🔴 Client disconnected: ${socket.id}`);

        // Handle reconnection attempts
        let userId = Object.keys(activeSessions).find(key => activeSessions[key] === socket.id);

        // If the userId exists and hasn't exceeded max reconnect attempts
        if (userId && reconnectAttempts[socket.id] < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts[socket.id]++;

            console.log(`Attempting to reconnect for user ${userId}... Attempt #${reconnectAttempts[socket.id]}`);

            // Attempt to reconnect after a delay
            setTimeout(() => {
                // Try to reconnect the user (could be an API or socket reconnect logic)
                reconnectUser(socket, userId);
            }, RECONNECT_DELAY);
        } else {
            // If reconnection attempts exceeded
            console.log(`Max reconnect attempts reached for user ${userId}`);
            delete activeSessions[userId]; // Remove from active sessions if max attempts are reached
        }

        // Clear session on disconnect
        for (let userId in activeSessions) {
            if (activeSessions[userId] === socket.id) {
                delete activeSessions[userId]; // Clear session
                console.log(`Session for user ${userId} ended`);
            }
        }
    });
});

// Function to attempt to reconnect a user
const reconnectUser = (socket, userId) => {
    // Check if the userId still exists
    if (activeSessions[userId]) {
        console.log(`User ${userId} has successfully reconnected.`);
        // You could emit some event to notify the client about reconnection success
        socket.emit('reconnected', { message: 'Reconnection successful!' });

        // Reset reconnection attempts upon successful reconnect
        reconnectAttempts[socket.id] = 0;
    } else {
        // If user session is no longer active, disconnect the socket
        socket.disconnect();
        console.log(`User ${userId} not active. Disconnecting.`);
    }
};

// Example endpoint that returns a simple "Connected successfully" message
app.get('/test', (req, res) => {
    console.log('Received request for /test');
    res.send('Connected successfully');  // Simple response
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
