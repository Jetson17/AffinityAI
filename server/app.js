const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const recommendationRoutes = require('./routes/recommendations');
const messageRoutes = require('./routes/messages');
const dsaRoutes = require('./routes/dsa');
const adminRoutes = require('./routes/admin');

const app = express();

// Configure allowed origins
const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000', 'http://127.0.0.1:5000'];

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Access denied from this origin.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Friend Recommendation API', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dsa', dsaRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler for undefined API routes
app.use((req, res, next) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
        console.error('Unhandled Server Error:', err);
    }
    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? 'An unexpected internal server error occurred.' : (err.message || 'Server error');
    res.status(err.status || 500).json({ error: message });
});

module.exports = app;
