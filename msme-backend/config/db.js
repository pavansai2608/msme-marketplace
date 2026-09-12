const mongoose = require('mongoose')

const connectDB = async (retryCount = 10) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    })
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    console.log(`📦 Using database: ${conn.connection.name}`)
  } catch (err) {
    if (retryCount > 0) {
      console.log(`📡 Connection flicker detected. Retrying in 3s... (${retryCount} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 3000))
      return connectDB(retryCount - 1)
    }
    console.error(`❌ MongoDB permanent failure: ${err.message}`)
    process.exit(1)
  }
}


module.exports = connectDB
