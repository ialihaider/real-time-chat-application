'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Send, Plus, LogOut, Users, MessageCircle } from 'lucide-react';
import RoomList from './RoomList';
import MessageList from './MessageList';
import CreateRoomModal from './CreateRoomModal';

interface Message {
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
}

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
  messages: Message[];
}

export default function ChatInterface() {
  const { user, logout, token } = useAuth();
  const { socket, isConnected, joinRoom, leaveRoom, sendMessage, startTyping, stopTyping } = useSocket();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch rooms on component mount
  useEffect(() => {
    fetchRooms();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('new-message', (message: Message) => {
      if (message.roomId === selectedRoom?.id) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('user-typing', (data: { user: any; roomId: string; isTyping: boolean }) => {
      if (data.roomId === selectedRoom?.id) {
        if (data.isTyping) {
          setTypingUsers(prev => [...prev.filter(u => u !== data.user.username), data.user.username]);
        } else {
          setTypingUsers(prev => prev.filter(u => u !== data.user.username));
        }
      }
    });

    socket.on('user-joined', (data: { user: any; roomId: string }) => {
      if (data.roomId === selectedRoom?.id) {
        // Add system message
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          content: `${data.user.username} joined the room`,
          type: 'SYSTEM',
          userId: 'system',
          roomId: data.roomId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: 'system',
            username: 'System'
          }
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    });

    socket.on('user-left', (data: { user: any; roomId: string }) => {
      if (data.roomId === selectedRoom?.id) {
        // Add system message
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          content: `${data.user.username} left the room`,
          type: 'SYSTEM',
          userId: 'system',
          roomId: data.roomId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: 'system',
            username: 'System'
          }
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    });

    return () => {
      socket.off('new-message');
      socket.off('user-typing');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [socket, selectedRoom]);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.rooms) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleRoomSelect = (room: Room) => {
    if (selectedRoom) {
      leaveRoom(selectedRoom.id);
    }
    
    setSelectedRoom(room);
    joinRoom(room.id);
    fetchMessages(room.id);
    setMessages([]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      // Use Socket.IO for real-time messaging
      sendMessage(selectedRoom.id, newMessage);
      setNewMessage('');
      stopTyping(selectedRoom.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      startTyping(selectedRoom!.id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(selectedRoom!.id);
    }, 1000);
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Chat Rooms</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateRoom(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {/* Room List */}
        <RoomList
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomSelect={handleRoomSelect}
          onRoomsUpdate={fetchRooms}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRoom.name}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedRoom.members.length} members
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {selectedRoom.members.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <MessageList
                messages={messages}
                currentUser={user}
                typingUsers={typingUsers}
                messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
              />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="text-black flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a room to start chatting
              </h3>
              <p className="text-gray-500">
                Choose a room from the sidebar to begin your conversation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onRoomCreated={(newRoom) => {
            setRooms(prev => [...prev, newRoom]);
            setShowCreateRoom(false);
          }}
        />
      )}
    </div>
  );
} 