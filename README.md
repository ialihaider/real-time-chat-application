# Real-Time Chat Application

A modern, full-featured real-time chat application built with Next.js, PostgreSQL, GraphQL, and Socket.IO.

## Features

- 🔐 **User Authentication** - Secure login/register with JWT tokens
- 💬 **Real-Time Messaging** - Instant message delivery with Socket.IO
- 🏠 **Chat Rooms** - Create and join public/private chat rooms
- 👥 **User Management** - User profiles, status, and room memberships
- ✍️ **Typing Indicators** - See when users are typing
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎨 **Modern UI** - Beautiful interface with Tailwind CSS
- 🔒 **Private Rooms** - Secure private chat rooms
- 📊 **GraphQL API** - Efficient data fetching and mutations
- 🗄️ **PostgreSQL Database** - Reliable data storage with Prisma ORM

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Real-Time**: Socket.IO
- **API**: REST API's
- **Authentication**: JWT tokens with bcrypt
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd real-time-chat-application
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your database:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/chat_app"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key-here"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Socket.IO
SOCKET_CORS_ORIGIN="http://localhost:3000"
```

### 4. Database Setup

Generate Prisma client and push the schema:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Database Schema

The application uses the following main entities:

- **Users**: User accounts with authentication
- **Rooms**: Chat rooms (public/private)
- **RoomMembers**: User memberships in rooms
- **Messages**: Chat messages with different types

### Socket.IO
- WebSocket connection for real-time features

## Key Features Explained

### Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Automatic token verification

### Real-Time Communication
- Socket.IO for instant message delivery
- Typing indicators
- User join/leave notifications
- Connection status indicators

### Chat Rooms
- Public and private rooms
- Room creation with descriptions
- Member management
- Message history

### User Interface
- Responsive design
- Modern chat interface
- Real-time status updates
- Beautiful animations

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── graphql/       # GraphQL endpoint
│   │   └── socket/        # Socket.IO endpoint
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── auth/             # Authentication components
│   └── chat/             # Chat interface components
├── contexts/             # React contexts
│   ├── AuthContext.tsx   # Authentication context
│   └── SocketContext.tsx # Socket.IO context
├── lib/                  # Utility libraries
│   └── graphql/          # GraphQL schema and resolvers
└── types/                # TypeScript type definitions
```

## Deployment

### Environment Variables

Make sure to set all required environment variables in your production environment:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure JWT signing secret
- `NEXTAUTH_URL` - Your application URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `SOCKET_CORS_ORIGIN` - Allowed CORS origins

### Database Migration

For production deployment, use Prisma migrations:

```bash
npm run db:generate
npx prisma migrate deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
