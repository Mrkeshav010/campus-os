const dns = require('dns');
const mongoose = require('mongoose');

// Some networks/ISPs refuse the SRV DNS lookup that mongodb+srv:// needs,
// which shows up as "querySrv ECONNREFUSED". Forcing public DNS servers
// for Node fixes it without touching any Windows network settings.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;