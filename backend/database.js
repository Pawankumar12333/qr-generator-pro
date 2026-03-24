require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            throw new Error('MONGO_URI not found in .env file');
        }

        // Clean version: No extra options needed for modern Mongoose
        await mongoose.connect(mongoURI);

        console.log('✅ MongoDB Atlas Cloud connected successfully!');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;