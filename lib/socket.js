const socketIo = require("socket.io");

let io;

const initializeSocketIo = (httpServer) => {
  io = socketIo(httpServer, {
    cors: {
      origin: "*",
      path: "/socket",
    },
  });
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }
  return io;
};

module.exports = { initializeSocketIo, getIo };
