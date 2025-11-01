const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const { RoomManager } = require('./roomManager');
const { setupSocketHandlers } = require('./socketHandlers');
const { GameStateManager } = require('./gameStateManager');

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',                          // Local development
  'http://localhost:5173',                          // Vite local (if needed)
  'https://kelimeo.vercel.app',                     // Production Vercel
  'https://kelimeo-git-main-omertaskes-projects.vercel.app', // Vercel git branch
  'https://kelimeo-git-gh-pages-omertaskes-projects.vercel.app', // Vercel gh-pages branch
];

// Add environment variable origins if provided
if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  allowedOrigins.push(...envOrigins);
}

console.log('🔐 CORS Allowed Origins:', allowedOrigins);

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

// Initialize managers
const roomManager = new RoomManager();
const gameStateManager = new GameStateManager();

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
  const origin = socket.handshake.headers?.origin || 'n/a';
  const ua = socket.handshake.headers?.['user-agent'] || 'n/a';
  console.log(`🔌 Socket connected: ${socket.id}`);
  console.log(`   🌍 Origin: ${origin}`);
  console.log(`   🧭 UA: ${ua}`);
  
  // Setup all socket event handlers BEFORE any other logic
  setupSocketHandlers(io, socket, roomManager, gameStateManager);
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🎮 KELIMEO MATCHMAKING SERVER       ║
  ║   📡 Server running on port ${PORT}     ║
  ║   🌐 http://localhost:${PORT}           ║
  ║   ✅ Socket.IO ready                   ║
  ║   🔐 Allowed origins: ${allowedOrigins.length}               ║
  ╚═══════════════════════════════════════╝
  `);
  console.log('📋 Allowed origins:', allowedOrigins);
});

module.exports = { io, roomManager, gameStateManager };
