require('dotenv').config()

const app = require('./app')
const connectDB = require('./config/db')

// Connect to Database and then start server
connectDB().then(() => {
  const PORT = process.env.PORT || 5000
  const server = app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Rocket Server running on port ${PORT}`))

  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...')
    console.error(err.name, err.message)
    server.close(() => process.exit(1))
  })

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...')
    server.close(() => {
      console.log('Server closed.')
      process.exit(0)
    })
  })
}).catch(err => {
  console.error('❌ Failed to start server:', err.message)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...')
  console.error(err.name, err.message)
  process.exit(1)
})
