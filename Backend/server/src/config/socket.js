const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Only logged-in users can connect. Identity comes from the JWT,
  // never from anything the client claims about itself.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Not authorized'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('role isActive');
      if (!user || !user.isActive) return next(new Error('Not authorized'));

      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      next();
    } catch (err) {
      next(new Error('Not authorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.data.userId); // personal room -> io.to(userId)
    socket.join(socket.data.role); // role room -> io.to('admin')

    socket.on('disconnect', () => {});
  });

  return io;
};

// Any controller can call getIO() to emit events without passing io around
const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket first.');
  return io;
};

module.exports = { initSocket, getIO };