# MongoDB Integration Setup

## Overview
Your application has been migrated from localStorage to MongoDB Atlas. All data is now stored in the cloud database.

## MongoDB Connection
- **Connection String**: `mongodb+srv://bjayantsne_db_user:<MONGODB_PASSWORD>@cluster0.9liq2qs.mongodb.net/jayant-portfolio`
- **Database Name**: `jayant-portfolio`

## Collections
1. **questions** - Interview questions and answers
2. **userprogresses** - User learning progress, bookmarks, study time
3. **auths** - Authentication status
4. **aiQAs** - AI-generated Q&A pairs

## Setup Instructions

### 1. Install Backend Dependencies
```powershell
cd server
npm install
```

### 2. Start the Backend Server
```powershell
cd server
npm start
```

The server will run on `http://localhost:3000`

### 3. Start Angular Application
Open a new terminal:
```powershell
npm start
```

The Angular app will run on `http://localhost:4200`

## API Endpoints

### Questions
- `GET /api/questions` - Get all questions
- `POST /api/questions` - Add new question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `DELETE /api/questions` - Clear all questions
- `POST /api/questions/import` - Import questions

### User Progress
- `GET /api/user-progress/:userId` - Get user progress
- `PUT /api/user-progress/:userId` - Update user progress

### Authentication
- `GET /api/auth/:userId` - Check auth status
- `POST /api/auth/login` - Login (username: admin, password: admin123)
- `POST /api/auth/logout` - Logout

### AI Q&A
- `GET /api/ai-qa/:userId` - Get all AI Q&As for user
- `POST /api/ai-qa` - Add AI Q&A
- `DELETE /api/ai-qa/:id` - Delete AI Q&A
- `PUT /api/ai-qa/:id` - Update AI Q&A

### Health Check
- `GET /api/health` - Check server and MongoDB connection status

## Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Changes Made

### Services Updated
1. **mongodb.service.ts** - New service to handle all MongoDB HTTP requests
2. **questions-data.service.ts** - Now uses MongoDB instead of localStorage
3. **auth.service.ts** - Authentication now stored in MongoDB
4. **questions-public.component.ts** - User progress saved to MongoDB
5. **ai-qa.component.ts** - AI Q&As saved to MongoDB

### Backend Created
- **server/server.js** - Express server with MongoDB integration
- **server/package.json** - Backend dependencies

### Removed
- All `localStorage.setItem()` calls
- All `localStorage.getItem()` calls
- All `localStorage.removeItem()` calls

## Development Tips

### Check MongoDB Connection
```powershell
# Visit health check endpoint
curl http://localhost:3000/api/health
```

### View Server Logs
The server logs will show:
- MongoDB connection status
- API requests
- Errors and warnings

### Testing
1. Start backend server first
2. Then start Angular app
3. Login with credentials: admin/admin123
4. Add questions - they'll be saved to MongoDB
5. Refresh page - data persists from MongoDB

## Troubleshooting

### Server won't start
- Make sure port 3000 is not in use
- Check MongoDB connection string is correct
- Verify internet connection (MongoDB Atlas requires internet)

### Cannot connect to MongoDB
- Check the connection string
- Verify MongoDB Atlas cluster is running
- Check firewall settings

### CORS errors
- The server already has CORS enabled
- Make sure backend is running on port 3000
- Make sure Angular is making requests to localhost:3000

## Production Deployment

For production:
1. Update `apiUrl` in `mongodb.service.ts` to your production backend URL
2. Deploy backend to a hosting service (Heroku, AWS, etc.)
3. Set environment variables for MongoDB connection
4. Enable HTTPS
5. Implement proper authentication with JWT tokens
6. Add rate limiting and security middleware

## Notes
- User ID is currently set to "default-user" for simplicity
- You can implement multi-user support by managing unique user IDs
- MongoDB automatically creates collections on first insert
- Sample questions are loaded if database is empty
