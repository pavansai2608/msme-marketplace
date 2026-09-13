const request = require('supertest')
const app = require('../app')

const PASSWORD = 'abcd1234'

const namedCookie = (res, name) => {
  const setCookie = res.headers['set-cookie'] || []
  const found = setCookie.find((c) => c.startsWith(`${name}=`))
  return found ? found.split(';')[0] : ''
}

// Everything the browser would send back: access + refresh + csrf.
const cookieFrom = (res) =>
  [namedCookie(res, 'token'), namedCookie(res, 'refreshToken'), namedCookie(res, 'csrfToken')]
    .filter(Boolean)
    .join('; ')

// Pulls the csrf value back out of a cookie STRING (what most tests pass
// around), so a request can echo it in the header the way the browser does.
const csrfOf = (cookieString) => (String(cookieString).match(/csrfToken=([^;]+)/) || [])[1] || ''

const csrfFrom = (res) => (namedCookie(res, 'csrfToken') || '').split('=')[1] || ''

// A request carrying both the cookies and the matching CSRF header, which is
// what the real client does.
const authed = (res, method, url) =>
  request(app)[method](url).set('Cookie', cookieFrom(res)).set('x-csrf-token', csrfFrom(res))

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

module.exports = {
  app,
  request,
  PASSWORD,
  cookieFrom,
  namedCookie,
  csrfFrom,
  csrfOf,
  authed,
  rawTokenCookie,
  registerUser,
  loginUser,
  SELLER_DETAILS,
  PRODUCT,
}
