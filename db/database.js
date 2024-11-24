const mongoose = require("mongoose")

const connectToDatabase = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("Database is connected successfully");
    } catch (error) {
      console.error("Error connecting to the database", error);
    }
  };
  
  const connectionPool = connectToDatabase();

module.exports = { connectionPool }