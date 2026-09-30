// Most real-time logic lives inline in config/socket.js (connection/register/disconnect).
// This file is where you add extra custom events as the app grows —
// e.g. typing indicators for Fee Query chat, admin "online" presence, etc.

const registerSocketHandlers = (io, socket) => {
  // Example: Fee Query live typing indicator
  socket.on('feeQuery:typing', ({ threadId, userId }) => {
    socket.broadcast.emit('feeQuery:typing', { threadId, userId });
  });
};

module.exports = { registerSocketHandlers };