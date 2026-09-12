const { app, request } = require('./helpers')

describe('smoke', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toMatch(/MSME API running/)
  })
})
