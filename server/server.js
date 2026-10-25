const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Friend Recommendation Backend running on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 DSA Lab API: http://localhost:${PORT}/api/dsa/friendship-graph`);
});
