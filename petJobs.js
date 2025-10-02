const http = require('http');
const WebSocket = require('ws');
const db = require('./db'); // Import your MySQL connection
const cron = require('node-cron');

// Create an HTTP server
const server = http.createServer();

// Create a WebSocket server on top of the HTTP server
const wss = new WebSocket.Server({ server });

// Store active connections by student_id
let activeConnections = {};

// When a user connects to the WebSocket server
wss.on('connection', (ws) => {
    console.log('A user connected');

    // Listen for the student_id when the client connects
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // Register the student and associate their socket with their student_id
        if (data.type === 'registerStudent') {
            activeConnections[data.studentId] = ws;
            console.log(`Student ${data.studentId} connected with WebSocket ID: ${ws._socket.remoteAddress}`);
        }

        // Listen for pet stats requests (for real-time updates)
        if (data.type === 'getPetStats') {
            db.query('SELECT * FROM pets WHERE student_id = ?', [data.studentId], (err, result) => {
                if (err) {
                    console.error('Error fetching pet stats:', err);
                    return;
                }
                ws.send(JSON.stringify({ type: 'petStats', pet: result[0] }));
            });
        }
    });

    // When the user disconnects, remove them from active connections
    ws.on('close', () => {
        for (let studentId in activeConnections) {
            if (activeConnections[studentId] === ws) {
                delete activeConnections[studentId];
                console.log(`Student ${studentId} disconnected.`);
            }
        }
    });
});

// Cron job to update pet stats (every hour)
cron.schedule('0 * * * *', async () => {  // Every hour
    console.log('🕒 Running pet stats update job:', new Date().toLocaleString());

    try {
        // Get all pets and update their stats
        const pets = await db.query('SELECT * FROM pets');
        
        for (let pet of pets) {
            let updated = false;
            const studentId = pet.student_id;

            // Check if stats need to be updated
            if (pet.hunger > 0) {
                pet.hunger = Math.max(pet.hunger - 15, 0);
                updated = true;
            }
            if (pet.playfulness > 0) {
                pet.playfulness = Math.max(pet.playfulness - 20, 0);
                updated = true;
            }
            if (pet.hygiene > 0) {
                pet.hygiene = Math.max(pet.hygiene - 10, 0);
                updated = true;
            }
            if (pet.sleep > 0) {
                pet.sleep = Math.max(pet.sleep - 5, 0);
                updated = true;
            }

            // Update pet stats in the database
            if (updated) {
                await db.query('UPDATE pets SET hunger = ?, playfulness = ?, hygiene = ?, sleep = ?, updated_at = NOW() WHERE id = ?', 
                [pet.hunger, pet.playfulness, pet.hygiene, pet.sleep, pet.id]);

                // Emit the updated stats only to the connected student
                if (activeConnections[studentId]) {
                    activeConnections[studentId].send(JSON.stringify({
                        type: 'petStatsUpdated',
                        pet: pet
                    }));
                    console.log(`Emitted updated stats to student ${studentId}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error updating pet stats:', error.message);
    }
});

// Start the HTTP server to handle WebSocket connections
server.listen(3000, () => {
    console.log('Server running on port 3000');
});
