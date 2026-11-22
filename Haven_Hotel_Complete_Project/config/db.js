const mongoose = require("mongoose");

let isConnected = false;

async function connectDB(uri) {
  const mongoURI = uri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/HotelManagement";

  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    console.log(`Connected to MongoDB: ${conn.connection.name} at ${conn.connection.host}:${conn.connection.port}`);
    return conn.connection;
  } catch (error) {
    console.error("Could not connect to MongoDB. Error details:", error.message);
    throw error;
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
  isConnected = false;
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

module.exports = {
  connectDB,
  mongoose
};
