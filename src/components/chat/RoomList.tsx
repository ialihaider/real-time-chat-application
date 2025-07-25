'use client';

import React from 'react';
import { MessageCircle, Lock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  members: Array<{
    id: string;
    userId: string;
    roomId: string;
    role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
    joinedAt: string;
    user: {
      id: string;
      username: string;
      avatar?: string;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    userId: string;
    roomId: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      username: string;
      avatar?: string;
    };
  }>;
}

interface RoomListProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onRoomSelect: (room: Room) => void;
  onRoomsUpdate: () => void;
}

export default function RoomList({ rooms, selectedRoom, onRoomSelect, onRoomsUpdate }: RoomListProps) {
  const getLastMessage = (room: Room) => {
    if (room.messages.length === 0) return null;
    return room.messages[0]; // Messages are already sorted by createdAt desc
  };

  const getLastMessagePreview = (message: any) => {
    if (message.type === 'SYSTEM') {
      return message.content;
    }
    return message.content.length > 30 
      ? `${message.content.substring(0, 30)}...` 
      : message.content;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {rooms.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No rooms available</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {rooms.map((room) => {
            const lastMessage = getLastMessage(room);
            const isSelected = selectedRoom?.id === room.id;
            
            return (
              <div
                key={room.id}
                onClick={() => onRoomSelect(room)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {room.name}
                      </h3>
                      {room.isPrivate && (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    
                    {room.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {room.description}
                      </p>
                    )}
                    
                    {lastMessage ? (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {lastMessage.user.username}:
                          </span>
                          <span className="text-xs text-gray-600 truncate">
                            {getLastMessagePreview(lastMessage)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">
                        No messages yet
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Users className="h-3 w-3" />
                    <span>{room.members.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 