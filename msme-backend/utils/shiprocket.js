const axios = require('axios');

class ShiprocketService {
  constructor() {
    this.email = process.env.SHIPROCKET_EMAIL;
    this.password = process.env.SHIPROCKET_PASSWORD;
    this.token = null;
  }

  async authenticate() {
    try {
      if (this.token) return this.token;
      
      const { data } = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
        email: this.email,
        password: this.password
      });
      
      this.token = data.token;
      return this.token;
    } catch (err) {
      console.error('Shiprocket Auth Error:', err.response?.data || err.message);
      return null;
    }
  }

  async checkServiceability(pickup_pincode, delivery_pincode, weight, cod = 1) {
    const token = await this.authenticate();
    if (!token) return { success: false, message: 'Auth failed' };

    try {
      const { data } = await axios.get('https://apiv2.shiprocket.in/v1/external/courier/serviceability/', {
        params: { pickup_pincode, delivery_pincode, weight, cod },
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data };
    }
  }

  async createOrder(orderData) {
    const token = await this.authenticate();
    if (!token) return null;

    try {
      const { data } = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    } catch (err) {
      console.error('Shiprocket Order Error:', err.response?.data || err.message);
      return null;
    }
  }
}

module.exports = new ShiprocketService();
