import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PubSub } from 'graphql-subscriptions';

const prisma = new PrismaClient();
const pubsub = new PubSub();

export const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.user.findUnique({ where: { id: user.id } });
    },
    
    users: async () => {
      return await prisma.user.findMany({
        include: {
          messages: true,
          roomMemberships: {
            include: { room: true }
          },
          createdRooms: true
        }
      });
    },
    
    user: async (_, { id }) => {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          messages: true,
          roomMemberships: {
            include: { room: true }
          },
          createdRooms: true
        }
      });
    },
    
    rooms: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      return await prisma.room.findMany({
        where: {
          OR: [
            { isPrivate: false },
            {
              members: {
                some: { userId: user.id }
              }
            }
          ]
        },
        include: {
          members: {
            include: { user: true }
          },
          messages: {
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          createdByUser: true
        }
      });
    },
    
    room: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          members: {
            include: { user: true }
          },
          messages: {
            include: { user: true },
            orderBy: { createdAt: 'asc' }
          },
          createdByUser: true
        }
      });
      
      if (!room) throw new Error('Room not found');
      
      // Check if user has access to private room
      if (room.isPrivate) {
        const membership = await prisma.roomMember.findUnique({
          where: { userId_roomId: { userId: user.id, roomId: id } }
        });
        if (!membership) throw new Error('Access denied');
      }
      
      return room;
    },
    
    messages: async (_, { roomId, limit = 50, offset = 0 }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if user has access to room
      const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId: user.id, roomId } }
      });
      
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new Error('Room not found');
      
      if (room.isPrivate && !membership) {
        throw new Error('Access denied');
      }
      
      return await prisma.message.findMany({
        where: { roomId },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });
    }
  },
  
  Mutation: {
    register: async (_, { email, username, password }) => {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
      });
      
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword
        }
      });
      
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
      
      return { token, user };
    },
    
    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }
      
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
      
      return { token, user };
    },
    
    updateProfile: async (_, { username, avatar, status }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      return await prisma.user.update({
        where: { id: user.id },
        data: { username, avatar, status }
      });
    },
    
    createRoom: async (_, { name, description, isPrivate }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const room = await prisma.room.create({
        data: {
          name,
          description,
          isPrivate: isPrivate || false,
          createdBy: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'ADMIN'
            }
          }
        },
        include: {
          members: { include: { user: true } },
          createdByUser: true
        }
      });
      
      pubsub.publish('ROOM_CREATED', { roomCreated: room });
      
      return room;
    },
    
    updateRoom: async (_, { id, name, description, isPrivate }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId: user.id, roomId: id } }
      });
      
      if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
        throw new Error('Insufficient permissions');
      }
      
      const room = await prisma.room.update({
        where: { id },
        data: { name, description, isPrivate },
        include: {
          members: { include: { user: true } },
          createdByUser: true
        }
      });
      
      pubsub.publish('ROOM_UPDATED', { roomUpdated: room });
      
      return room;
    },
    
    deleteRoom: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId: user.id, roomId: id } }
      });
      
      if (!membership || membership.role !== 'ADMIN') {
        throw new Error('Insufficient permissions');
      }
      
      await prisma.room.delete({ where: { id } });
      
      return true;
    },
    
    joinRoom: async (_, { roomId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const existingMembership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId: user.id, roomId } }
      });
      
      if (existingMembership) {
        throw new Error('Already a member of this room');
      }
      
      const membership = await prisma.roomMember.create({
        data: {
          userId: user.id,
          roomId,
          role: 'MEMBER'
        },
        include: {
          user: true,
          room: true
        }
      });
      
      return membership;
    },
    
    leaveRoom: async (_, { roomId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      await prisma.roomMember.delete({
        where: { userId_roomId: { userId: user.id, roomId } }
      });
      
      return true;
    },
    
    sendMessage: async (_, { roomId, content, type = 'TEXT' }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if user is member of room
      const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId: user.id, roomId } }
      });
      
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new Error('Room not found');
      
      if (room.isPrivate && !membership) {
        throw new Error('Access denied');
      }
      
      const message = await prisma.message.create({
        data: {
          content,
          type,
          userId: user.id,
          roomId
        },
        include: { user: true }
      });
      
      pubsub.publish('MESSAGE_ADDED', { 
        messageAdded: message,
        roomId 
      });
      
      return message;
    },
    
    deleteMessage: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const message = await prisma.message.findUnique({
        where: { id },
        include: { user: true }
      });
      
      if (!message) throw new Error('Message not found');
      
      if (message.userId !== user.id) {
        const membership = await prisma.roomMember.findUnique({
          where: { userId_roomId: { userId: user.id, roomId: message.roomId } }
        });
        
        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
          throw new Error('Insufficient permissions');
        }
      }
      
      await prisma.message.delete({ where: { id } });
      
      return true;
    }
  },
  
  Subscription: {
    messageAdded: {
      subscribe: () => pubsub.asyncIterator(['MESSAGE_ADDED'])
    },
    
    userStatusChanged: {
      subscribe: () => pubsub.asyncIterator(['USER_STATUS_CHANGED'])
    },
    
    roomUpdated: {
      subscribe: () => pubsub.asyncIterator(['ROOM_UPDATED'])
    }
  }
}; 