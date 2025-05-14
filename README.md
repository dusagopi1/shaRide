# Rapido Ride Share Application

A real-time ride sharing platform built with Node.js, Express, MongoDB, and Socket.IO.

## Features

- User Authentication (Login/Signup)
- Real-time ride sharing
- Driver ride creation
- Rider ride joining
- Match confirmation
- Real-time updates via Socket.IO
- In-app WhatsApp messaging between drivers and riders

## Project Structure

```
/ride-share
├── client/                  # Frontend
├── server/                  # Backend
└── package.json             # Dependencies
```

## Setup Instructions

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Create a `.env` file in the root directory with:
     ```
     MONGODB_URI=mongodb://localhost17/DEEPRIDE
     JWT_SECRET=your_jwt_secret_key
     PORT=3000
     ```

3. Start the server:
   - Development: `npm run dev`
   - Production: `npm start`

4. Access the application:
   - Open `http://localhost:3000` in your browser

### Deploying to Render

1. Create a free account on [Render](https://render.com/)

2. From your Render dashboard:
   - Click "New" and select "Web Service"
   - Connect your GitHub repository or use the manual deploy option

3. Configure the service:
   - Name: "rapido-ride-share" (or your preferred name)
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

4. Set environment variables in Render dashboard:
   - `NODE_ENV`: production
   - `MONGODB_URI`: Your MongoDB connection string (use MongoDB Atlas for cloud deployment)
   - `JWT_SECRET`: Your JWT secret key

5. Deploy your application

6. After deployment, your app will be available at the URL provided by Render

## Tech Stack

- Frontend: HTML, Tailwind CSS, Vanilla JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- Real-time: Socket.IO

## License

MIT