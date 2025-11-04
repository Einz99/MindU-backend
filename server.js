require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require('./jobs');
const os = require("os");
const cron = require('node-cron');
const db = require('./db');

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
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (React Native, mobile apps)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow all origins (development only!)
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.options('*', cors());

app.use((req, res, next) => {
  // Only set strict headers for Unity WebGL files
  if (req.path.includes('/play-pet') || req.path.includes('/petGame')) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }
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

const chatbotSettings = require("./routes/chatbotSettingsRoutes");
app.use("/api/chatbotSettings", (req, res, next) => {
  req.io = io;
  next();
}, chatbotSettings);

// SINGLE WebSocket Connection Handler
io.on("connection", (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`);

  // When a student joins the chat
  socket.on('join-chat', (student_id) => {
    const roomName = `student-${student_id}`;
    socket.join(roomName);
    
    // Store the student's socket ID and room information
    activeSessions[student_id] = {
      socketId: socket.id,
      isAgentAvailable: false,
      roomName: roomName,
      staffSockets: [] // List of agent sockets that have joined this student's room
    };
    
    console.log(`Student ${student_id} joined room: ${roomName}`);
  });

  // When a staff member (agent) joins - mark them as an agent
  socket.on('join-agent', () => {
    socket.isAgent = true; // Mark this socket as an agent
    console.log(`Agent socket marked: ${socket.id}`);
  });

  // When agent joins a specific student room
  socket.on('join-room', (student_id) => {
    const roomName = `student-${student_id}`;
    socket.join(roomName);
    
    // Initialize session if it doesn't exist
    if (!activeSessions[student_id]) {
      activeSessions[student_id] = {
        socketId: null,
        isAgentAvailable: false,
        roomName: roomName,
        staffSockets: []
      };
    }
    
    // Add the staff socket to the list of available staff for the student
    if (!activeSessions[student_id].staffSockets.includes(socket.id)) {
      activeSessions[student_id].staffSockets.push(socket.id);
    }
    
    console.log(`Agent ${socket.id} joined room: ${roomName}. Total agents: ${activeSessions[student_id].staffSockets.length}`);
    
    // Notify this agent about the room status
    socket.emit('agent-room-status', {
      student_id,
      hasActiveAgent: activeSessions[student_id].isAgentAvailable,
      agentCount: activeSessions[student_id].staffSockets.length
    });
  });

  socket.on('check-agent-in-room', (student_id) => {
    const roomName = `student-${student_id}`;
    const hasActiveAgent = activeSessions[student_id]?.staffSockets?.length > 0;
    
    socket.emit('agent-room-status', {
      student_id,
      hasActiveAgent,
      agentCount: activeSessions[student_id]?.staffSockets?.length || 0
    });
  });
  
  // When agent accepts chat, notify OTHER agents
  socket.on('agent-accept-chat', (data) => {
    const { student_id } = data;
    const roomName = `student-${student_id}`;
    
    console.log(`🤝 Agent ${socket.id} accepted chat for student ${student_id}`);
    
    if (!activeSessions[student_id]) {
      activeSessions[student_id] = {
        socketId: null,
        isAgentAvailable: false,
        roomName: roomName,
        staffSockets: []
      };
    }
    
    activeSessions[student_id].isAgentAvailable = true;
    if (!activeSessions[student_id].staffSockets.includes(socket.id)) {
      activeSessions[student_id].staffSockets.push(socket.id);
    }
    
    // Notify OTHER agents that this chat is now taken
    activeSessions[student_id].staffSockets.forEach((staffSocketId) => {
      if (staffSocketId !== socket.id) {
        io.to(staffSocketId).emit('chat-accepted-by-another-agent', {
          student_id,
          acceptedBy: socket.id
        });
      }
    });
    
    io.to(roomName).emit('agent-available', { 
      student_id,
      isAgentAvailable: true 
    });
  });

  socket.on('agent-disconnecting', (data) => {
    const { student_id } = data;
    const roomName = `student-${student_id}`;
    
    console.log(`🔌 Agent ${socket.id} is disconnecting for student ${student_id}`);
    
    // Update active session to set agent as not available
    if (activeSessions[student_id]) {
      const socketIndex = activeSessions[student_id].staffSockets.indexOf(socket.id);
      if (socketIndex !== -1) {
        activeSessions[student_id].staffSockets.splice(socketIndex, 1);
      }
      
      // Only mark as unavailable if NO agents remain
      if (activeSessions[student_id].staffSockets.length === 0) {
        activeSessions[student_id].isAgentAvailable = false;
      }
    }

    // Notify the student that the agent is no longer available
    io.to(roomName).emit('agent-disconnection', { 
      student_id,
      isAgentAvailable: activeSessions[student_id]?.staffSockets.length > 0
    });

    console.log(`✅ Emitted agent-disconnection to room ${roomName}`);
  });

  // When a student sends a message
  socket.on('student-message', (data) => {
    const { student_id, message } = data;
    const roomName = `student-${student_id}`;

    console.log(`📨 Student ${student_id} sent message:`, message);

    // Emit to the student's room (includes student and any agents in the room)
    io.to(roomName).emit('new-chat-message', {
      student_id,
      message,
      is_from_office: false
    });

    console.log(`✅ Emitted message to room ${roomName}`);
  });

  // When a staff member replies to the student
  socket.on('staff-message', (data) => {
    const { student_id, message } = data;
    const roomName = `student-${student_id}`;

    console.log(`📨 Agent ${socket.id} sent message to student ${student_id}:`, message);

    // Emit the reply to the student's room
    io.to(roomName).emit('new-chat-message', {
      student_id,
      message,
      is_from_office: true
    });

    console.log(`✅ Emitted agent message to room ${roomName}`);
  });

  // Handle disconnections and clean up the session
  socket.on("disconnect", () => {
    console.log(`🔴 Client disconnected: ${socket.id}`);

    // Clean up the session and remove from active sessions
    for (const [student_id, session] of Object.entries(activeSessions)) {
      if (session.socketId === socket.id || session.staffSockets.includes(socket.id)) {
        // Remove the socket from the staffSockets list
        activeSessions[student_id].staffSockets = activeSessions[student_id].staffSockets.filter(
          (staffSocketId) => staffSocketId !== socket.id
        );

        // If no agents are left, mark the session as inactive
        if (activeSessions[student_id].staffSockets.length === 0) {
          activeSessions[student_id].isAgentAvailable = false;
        }

        console.log(`Cleaned up socket ${socket.id} from student ${student_id}. Remaining agents: ${activeSessions[student_id].staffSockets.length}`);
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

let sleepingPets = {};  

app.post('/toggle-pet-sleep', async (req, res) => {
    const { petId, isSleep } = req.body;
    try {
        console.log(`Received sleep status update for pet ${petId}: ${isSleep ? "Sleeping" : "Awake"}`);

        // Update the pet's sleep state in memory or database
        if (isSleep) {
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

cron.schedule('*/10 * * * *', async () => {
  const currentTime = new Date();
  const minutes = currentTime.getMinutes();
  if (minutes % 10 === 0) {
    try {
      // First query: Decrement sleep for pets not in sleepingPets
      const sleepingPetIds = Object.keys(sleepingPets);  // Get all pet IDs from sleepingPets
      const sleepingPetIdsList = sleepingPetIds.length > 0 ? sleepingPetIds.join(', ') : 'NULL'; // Use NULL if no sleepingPets

      // Second query: Add sleep for pets in sleepingPets
      if (sleepingPetIds.length > 0) {
        await db.query(`
          UPDATE pets
          SET sleep = GREATEST(sleep + 17, 0)
          WHERE id IN (${sleepingPetIds.join(', ')})`);
      }

      await db.query(`
        UPDATE pets
        SET sleep = GREATEST(sleep - 5, 0)
        WHERE id NOT IN (${sleepingPetIdsList})`);

      

    } catch (error) {
      console.error("Error updating sleep times:", error);
    }
  }
});

app.use('/play-pet', express.static(path.join(__dirname, 'petGame'), {
    setHeaders: (res, filePath) => {
        // Set correct MIME types for Unity WebGL files
        if (filePath.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
        }
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        if (filePath.endsWith('.gz')) {
            res.setHeader('Content-Encoding', 'gzip');
        }
        if (filePath.endsWith('.br')) {
            res.setHeader('Content-Encoding', 'br');
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Route for playing pet game with student ID
app.get('/play-pet/:id', (req, res) => {
    const studentId = req.params.id;
    console.log(`🎮 Opening pet game for student ID: ${studentId}`);
    
    // Send the Unity index.html
    // The Unity game will extract the ID from the URL automatically
    res.sendFile(path.join(__dirname, 'petGame', 'index.html'));
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