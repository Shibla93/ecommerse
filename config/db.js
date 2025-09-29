const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    console.log("MONGO_URI:", process.env.MONGO_URI);  // check before using
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ DB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
