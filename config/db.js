const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wasam-store');

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        console.warn('Running in fallback mode (No Database). caching will be disabled.');
        // process.exit(1); // Keep server running without DB
    }
};

module.exports = connectDB;
