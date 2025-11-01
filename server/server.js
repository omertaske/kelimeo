const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { RoomManager } = require('./roomManager');
const { setupSocketHandlers } = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',           // Local development
  'https://kelimeo.vercel.app',      // Production Vercel
  'https://*.vercel.app',            // Vercel preview deployments
];

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp(allowed.replace('*', '.*'));
        return regex.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const regex = new RegExp(allowed.replace('*', '.*'));
          return regex.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`❌ Socket CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize room manager
const roomManager = new RoomManager();

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = roomManager.getServerStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ...stats
  });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  
  // Setup all socket event handlers
  setupSocketHandlers(io, socket, roomManager);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🎮 KELIMEO MATCHMAKING SERVER       ║
  ║   📡 Server running on port ${PORT}     ║
  ║   🌐 http://localhost:${PORT}           ║
  ║   ✅ Socket.IO ready                   ║
  ╚═══════════════════════════════════════╝
  `);
});

module.exports = { io, roomManager };
