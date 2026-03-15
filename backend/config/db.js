// =============================================
// config/db.js - MongoDB connection setup
// =============================================

const mongoose = require('mongoose');

// MongoDB connection URI - change this if using a remote DB (e.g., MongoDB Atlas)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Attendence';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected Successfully!');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1); // Stop the server if DB connection fails
  }
};

module.exports = connectDB;
