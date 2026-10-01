import app from "./app";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocket } from "./modules/realtime/socket";
import { startExpirationWorker } from "./workers/expirationWorker";

const PORT = process.env.PORT || 4000;

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

setupSocket(io);

// Start node-cron workers
startExpirationWorker(io);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
