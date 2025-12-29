const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    return {
      success: true,
      host: conn.connection.host,
      database: conn.connection.name
    };
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = connectDB;

