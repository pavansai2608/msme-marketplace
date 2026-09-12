require('dotenv').config()
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'  // Fix SSL on Windows + Node 22

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const passport = require('passport')
const compression = require('compression')
const connectDB = require('./config/db')
const morgan = require('morgan')
require('./config/passport')

const app = express()

// Rocket-Fast performance middle-wares
app.use(compression()) // Compresses all responses
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    "http://localhost:3001"
  ],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cookieParser())
app.use(passport.initialize())
app.use(morgan('dev', { skip: (req) => req.url === '/health' }))

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  res.setHeader('X-Request-ID', req.id)
  next()
})

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/user', require('./routes/userRoutes'))
app.use('/api/products', require('./routes/productRoutes'))
app.use('/api/orders', require('./routes/orderRoutes'))
app.use('/api/cart', require('./routes/cartRoutes'))
app.use('/api/schemes', require('./routes/schemeRoutes'))

app.get('/health', (req, res) => res.json({ status: 'MSME API running ✅' }))

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.name}: ${err.message}`)
  console.error(err.stack)

  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal server error'

  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors).map(val => val.message).join(', ')
  }

  if (err.code === 11000) {
    statusCode = 400
    const field = Object.keys(err.keyValue)[0]
    message = `${field} already exists`
  }

  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}: ${err.value}`
  }

  res.status(statusCode).json({ success: false, message })
})

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
