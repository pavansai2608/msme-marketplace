// Environment must be fixed BEFORE app.js (and therefore dotenv/passport) loads.
// dotenv does not override already-set vars, so these win over the real .env.
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-not-a-real-key'
process.env.JWT_EXPIRE = '7d'
process.env.CLIENT_URL = 'http://localhost:3001'

// Google must look unconfigured so the 503 path is what gets exercised.
// These are set to '' rather than deleted: dotenv only skips keys that are
// already present, so deleting them would let the real .env repopulate them.
process.env.GOOGLE_CLIENT_ID = ''
process.env.GOOGLE_CLIENT_SECRET = ''
process.env.GOOGLE_CALLBACK_URL = ''

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongo

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  const uri = mongo.getUri()
  // Point anything that reads MONGO_URL at the in-memory server, never Atlas.
  process.env.MONGO_URL = uri
  await mongoose.connect(uri)
}, 120000)

// Clear between tests so each one starts from an empty database.
afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongo) await mongo.stop()
})
