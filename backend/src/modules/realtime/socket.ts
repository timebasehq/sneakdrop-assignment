import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const cookieName = process.env.COOKIE_NAME || "sneakdrop_session";
const jwtSecret = process.env.JWT_SECRET || "secret";

let ioInstance: Server | null = null;

export const setupSocket = (io: Server) => {
  ioInstance = io;
  
  // Socket.IO middleware for authentication
  io.use((socket, next) => {
    const cookiesStr = socket.request.headers.cookie;
    if (!cookiesStr) {
      return next(new Error("Authentication error"));
    }
    
    const cookies = cookie.parse(cookiesStr);
    const token = cookies[cookieName];
    
    if (!token) {
      return next(new Error("Authentication error"));
    }
    
    try {
      const decoded: any = jwt.verify(token, jwtSecret);
      // Attach user info to socket
      (socket as any).user = decoded;
      next();
    } catch (err) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).user.userId;
    console.log(`Socket connected: ${socket.id} for user ${userId}`);
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} for user ${userId}`);
    });
  });
};

export const getIO = () => {
  return ioInstance;
};
