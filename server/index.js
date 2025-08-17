import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { MongoClient } from 'mongodb';

import createAuthRouter from './routes/auth.js';
import createSpotifyRouter from './routes/spotify.js';
import makeAuthenticateJWT from './middleware/authenticateJWT.js';

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 8080;

// Basic routes
app.get('/', (_req, res) => res.send("Welcome to Angelica's Project API 🚀"));
app.get('/health', (_req, res) =>
    res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' })
);

// MongoDB
const mongo = new MongoClient(process.env.MONGODB_URI);
await mongo.connect();
const db = mongo.db();
const Users = db.collection('users');
const Sessions = db.collection('sessions');

// Routers & middleware
const authenticateJWT = makeAuthenticateJWT(Sessions);

app.use('/auth', createAuthRouter({ Users, Sessions }));
app.use('/api', authenticateJWT, createSpotifyRouter({ Users })); // all /api/* protected

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.originalUrl }));

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
