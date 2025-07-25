import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get a specific room
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const roomId = await params.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
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

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if user has access to private room
    if (room.isPrivate) {
      const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId: decoded.userId, roomId } }
      });
      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ room });

  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 