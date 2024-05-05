const socketIo = require("socket.io");
const { get } = require("..");

let io;

const initializeSocketIo = (httpServer) => {
  io = socketIo(httpServer, {
    cors: {
      origin: "*",
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
