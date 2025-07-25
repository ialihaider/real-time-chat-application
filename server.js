const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO server
  const io = new Server(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.data.user = user;
      next();
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    console.log(`User ${socket.data.user.username} connected`);
    
    // Update user status to online
    prisma.user.update({
      where: { id: socket.data.user.id },
      data: { status: 'ONLINE' }
    });
    
    // Join user to their rooms
    prisma.roomMember.findMany({
      where: { userId: socket.data.user.id },
      include: { room: true }
    }).then((memberships) => {
      memberships.forEach((membership) => {
        socket.join(`room:${membership.roomId}`);
      });
    });
    
    // Handle joining a room
    socket.on('join-room', (roomId) => {
      socket.join(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('user-joined', {
        user: socket.data.user,
        roomId
      });
    });
    
    // Handle leaving a room
    socket.on('leave-room', (roomId) => {
      socket.leave(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('user-left', {
        user: socket.data.user,
        roomId
      });
    });
    
    // Handle typing events
    socket.on('typing-start', (roomId) => {
      socket.to(`room:${roomId}`).emit('user-typing', {
        user: socket.data.user,
        roomId,
        isTyping: true
      });
    });
    
    socket.on('typing-stop', (roomId) => {
      socket.to(`room:${roomId}`).emit('user-typing', {
        user: socket.data.user,
        roomId,
        isTyping: false
      });
    });
    
    // Handle sending messages
    socket.on('send-message', async (data) => {
      try {
        const { roomId, content, type = 'TEXT' } = data;
        
        // Check if user is member of room
        const membership = await prisma.roomMember.findUnique({
          where: { userId_roomId: { userId: socket.data.user.id, roomId } }
        });
        
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        if (room.isPrivate && !membership) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }
        
        // Create message in database
        const message = await prisma.message.create({
          data: {
            content,
            type,
            userId: socket.data.user.id,
            roomId
          },
          include: { user: true }
        });
        
        // Broadcast message to room
        io.to(`room:${roomId}`).emit('new-message', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user.username} disconnected`);
      
      // Update user status to offline
      prisma.user.update({
        where: { id: socket.data.user.id },
        data: { status: 'OFFLINE' }
      });
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 