const request = require('supertest')
const app = require('../app')

const PASSWORD = 'abcd1234'

const cookieFrom = (res) => {
  const setCookie = res.headers['set-cookie'] || []
  const token = setCookie.find((c) => c.startsWith('token='))
  return token ? token.split(';')[0] : ''
}

const rawTokenCookie = (res) =>
  (res.headers['set-cookie'] || []).find((c) => c.startsWith('token=')) || ''

const registerUser = async (name, email, password = PASSWORD) => {
  const res = await request(app).post('/api/auth/register').send({ name, email, password })
  return { res, cookie: cookieFrom(res) }
}

const loginUser = async (email, password = PASSWORD) => {
  const res = await request(app).post('/api/auth/login').send({ email, password })
  return { res, cookie: cookieFrom(res) }
}

const SELLER_DETAILS = {
  businessName: 'Test Pottery Co',
  panCardName: 'Test Owner',
  state: 'Telangana',
  district: 'Hyderabad',
}

const PRODUCT = {
  name: 'Test Pot',
  description: 'A clay pot',
  price: 500,
  category: 'Pottery',
  images: ['http://example.com/pot.png'],
  sizes: [{ size: 'M', stock: 10 }],
}

module.exports = { app, request, PASSWORD, cookieFrom, rawTokenCookie, registerUser, loginUser, SELLER_DETAILS, PRODUCT }
