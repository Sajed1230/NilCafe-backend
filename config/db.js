const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      console.error('❌ MongoDB Connection Error: MONGODB_URI is not defined in environment variables.');
      console.error('📝 Please create a .env file in the backend directory with:');
      console.error('   MONGODB_URI=your_mongodb_connection_string');
      console.error('   Example: MONGODB_URI=mongodb://localhost:27017/nilecafe');
      console.error('   Or: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nilecafe');
      return {
        success: false,
        error: 'MONGODB_URI is not defined in environment variables. Please create a .env file.'
      };
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    return {
      success: true,
      host: conn.connection.host,
      database: conn.connection.name
    };
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = connectDB;

