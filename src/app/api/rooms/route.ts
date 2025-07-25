import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
});

// Get all rooms for the authenticated user
export async function GET(request: NextRequest) {
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

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { isPrivate: false },
          {
            members: {
              some: { userId: decoded.userId }
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

    return NextResponse.json({ rooms });

  } catch (error) {
    console.error('Get rooms error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new room
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { name, description, isPrivate } = createRoomSchema.parse(body);

    const room = await prisma.room.create({
      data: {
        name,
        description,
        isPrivate: isPrivate || false,
        createdBy: decoded.userId,
        members: {
          create: {
            userId: decoded.userId,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: { include: { user: true } },
        createdByUser: true
      }
    });

    return NextResponse.json({ room }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error},
        { status: 400 }
      );
    }

    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 