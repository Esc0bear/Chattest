import { io } from 'socket.io-client';

export const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

// Debug logs
socket.on('connect', () => {
  console.log('🔌 Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('🔄 Socket reconnection attempt:', attemptNumber);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
});