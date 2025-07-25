import { Server as NetServer, Socket } from 'net';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export interface ServerToClientEvents {
  'user-joined': (data: { user: any; roomId: string }) => void;
  'user-left': (data: { user: any; roomId: string }) => void;
  'user-typing': (data: { user: any; roomId: string; isTyping: boolean }) => void;
  'message-received': (data: { message: any; roomId: string }) => void;
}

export interface ClientToServerEvents {
  'join-room': (roomId: string) => void;
  'leave-room': (roomId: string) => void;
  'typing-start': (roomId: string) => void;
  'typing-stop': (roomId: string) => void;
  'send-message': (data: { content: string; roomId: string }) => void;
} 