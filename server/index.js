import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

let waitingUsers = [];
const activeRooms = new Map();

io.on('connection', (socket) => {
  console.log('👤 New connection:', socket.id);

  socket.on('start_chat', () => {
    console.log('🔍 User looking for chat:', socket.id);
    waitingUsers = waitingUsers.filter(id => id !== socket.id);
    
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.shift();
      const room = `room_${partner}_${socket.id}`;
      
      console.log(`✨ Creating room: ${room}`);
      activeRooms.set(room, [socket.id, partner]);
      
      socket.join(room);
      io.sockets.sockets.get(partner)?.join(room);
      
      io.to(room).emit('chat_started', { room });
      console.log(`🎉 Chat started in room: ${room}`);
    } else {
      waitingUsers.push(socket.id);
      console.log('⏳ Added to waiting list:', socket.id);
    }
  });

  socket.on('signal', ({ signal, room }) => {
    console.log(`📡 Signal received from ${socket.id} in room ${room}`);
    
    if (!activeRooms.has(room)) {
      console.log('❌ Room not found:', room);
      return;
    }
    
    const [user1, user2] = activeRooms.get(room);
    const partner = user1 === socket.id ? user2 : user1;
    
    console.log(`📤 Sending signal to partner ${partner}`);
    io.to(partner).emit('signal', { signal, from: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
    
    waitingUsers = waitingUsers.filter(id => id !== socket.id);
    
    activeRooms.forEach((users, room) => {
      if (users.includes(socket.id)) {
        const partner = users.find(id => id !== socket.id);
        if (partner) {
          io.to(partner).emit('peer_disconnected');
        }
        activeRooms.delete(room);
      }
    });
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});