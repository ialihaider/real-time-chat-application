'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, content: string) => void;
  startTyping: (roomId: string) => void;
  stopTyping: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user && token) {
      console.log('Initializing Socket.IO connection...');
      
      const newSocket = io('http://localhost:3000', {
        path: '/api/socket',
        auth: {
          token
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Connected to Socket.IO server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('new-message', (message) => {
        console.log('New message received:', message);
        // You can emit a custom event here to notify components
        window.dispatchEvent(new CustomEvent('new-message', { detail: message }));
      });

      newSocket.on('user-joined', (data) => {
        console.log('User joined room:', data);
        window.dispatchEvent(new CustomEvent('user-joined', { detail: data }));
      });

      newSocket.on('user-left', (data) => {
        console.log('User left room:', data);
        window.dispatchEvent(new CustomEvent('user-left', { detail: data }));
      });

      newSocket.on('user-typing', (data) => {
        console.log('User typing:', data);
        window.dispatchEvent(new CustomEvent('user-typing', { detail: data }));
      });

      newSocket.on('error', (error) => {
        console.error('Socket.IO error:', error);
      });

      setSocket(newSocket);

      return () => {
        console.log('Cleaning up Socket.IO connection...');
        newSocket.close();
      };
    } else {
      if (socket) {
        console.log('User logged out, closing Socket.IO connection...');
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user, token]);

  const joinRoom = (roomId: string) => {
    if (socket && isConnected) {
      console.log('Joining room:', roomId);
      socket.emit('join-room', roomId);
    } else {
      console.warn('Cannot join room: Socket not connected');
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket && isConnected) {
      console.log('Leaving room:', roomId);
      socket.emit('leave-room', roomId);
    } else {
      console.warn('Cannot leave room: Socket not connected');
    }
  };

  const sendMessage = (roomId: string, content: string) => {
    if (socket && isConnected) {
      console.log('Sending message to room:', roomId, content);
      socket.emit('send-message', { roomId, content });
    } else {
      console.warn('Cannot send message: Socket not connected');
    }
  };

  const startTyping = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit('typing-start', roomId);
    }
  };

  const stopTyping = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit('typing-stop', roomId);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      joinRoom,
      leaveRoom,
      sendMessage,
      startTyping,
      stopTyping
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
} 