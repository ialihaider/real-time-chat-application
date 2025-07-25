'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';

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

interface CurrentUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY';
  createdAt: string;
  updatedAt: string;
}

interface MessageListProps {
  messages: Message[];
  currentUser: CurrentUser | null;
  typingUsers: string[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function MessageList({ messages, currentUser, typingUsers, messagesEndRef }: MessageListProps) {
  const isOwnMessage = (message: Message) => {
    return message.userId === currentUser?.id;
  };

  const getMessageTime = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  };

  const renderMessage = (message: Message) => {
    if (message.type === 'SYSTEM') {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
            {message.content}
          </div>
        </div>
      );
    }

    const ownMessage = isOwnMessage(message);

    return (
      <div
        key={message.id}
        className={`flex ${ownMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex ${ownMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-xs lg:max-w-md`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${ownMessage ? 'ml-2' : 'mr-2'}`}>
            {message.user.avatar ? (
              <img
                src={message.user.avatar}
                alt={message.user.username}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className={`flex flex-col ${ownMessage ? 'items-end' : 'items-start'}`}>
            {/* Username */}
            <div className={`text-xs text-gray-500 mb-1 ${ownMessage ? 'text-right' : 'text-left'}`}>
              {message.user.username}
            </div>

            {/* Message Bubble */}
            <div
              className={`px-4 py-2 rounded-lg max-w-xs lg:max-w-md break-words ${
                ownMessage
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              {message.type === 'TEXT' && (
                <p className="text-sm">{message.content}</p>
              )}
              {message.type === 'IMAGE' && (
                <img
                  src={message.content}
                  alt="Image"
                  className="max-w-full rounded"
                />
              )}
              {message.type === 'FILE' && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-sm">{message.content}</span>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className={`text-xs text-gray-400 mt-1 ${ownMessage ? 'text-right' : 'text-left'}`}>
              {getMessageTime(message.createdAt)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start mb-4">
            <div className="flex items-end space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.join(', ')} are typing...`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scroll to bottom anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 