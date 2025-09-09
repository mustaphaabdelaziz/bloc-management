const mongoose = require("mongoose");
const User = require("../models/User");

// ============ database connection ====================
// const dbUrl ="mongodb+srv://aziz:dancemonkey@cluster0.koaje.mongodb.net/eventplus?retryWrites=true&w=majority";
// const dbUrl = process.env.DB_URL || process.env.LOCAL_DB_URL;
const dbUrl = process.env.MONGODB_URI;

// Function to connect to the database
const connectDB = async () => {
  try {
    await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
    });

    console.log("Database connected");

    // Optional: Check for admin user creation (if needed)
    // const userExist = await User.findOne({ email: process.env.ADMIN_EMAIL });
    // if (!userExist) {
    //   // Create admin user logic here if required
    // }

  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1); // Exit the process if connection fails
  }
};

// Export the connectDB function
module.exports = connectDB;