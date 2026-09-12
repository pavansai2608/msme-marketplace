const mongoose = require('mongoose');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function verifyData() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Find the primary seller (Chakri)
    const seller = await mongoose.connection.db.collection('users').findOne({ name: /Chakri/i });
    if (!seller) {
        console.log('❌ Seller "Chakri" not found.');
        return;
    }
    console.log(`\n🔍 SELLER INFO: ID: ${seller._id} | Name: ${seller.name}`);

    // Check Orders
    const orders = await mongoose.connection.db.collection('orders').find({ 'products.seller': seller._id }).toArray();
    console.log(`\n📦 ORDERS FOR SELLER: ${orders.length}`);
    orders.slice(0, 3).forEach(o => {
        console.log(`- Order ID: ${o._id} | Status: ${o.status} | CreatedAt: ${o.createdAt}`);
    });

    // Check Stats Logic (Simplified replication of controller)
    const deliveredOrders = orders.filter(o => o.status === 'Delivered');
    const totalSales = deliveredOrders.reduce((acc, order) => {
      const sellerProducts = order.products.filter(p => p.seller.toString() === seller._id.toString());
      const sellerTotal = sellerProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      return acc + sellerTotal;
    }, 0);

    console.log(`\n📊 CALCULATED STATS:`);
    console.log(`- Delivered Orders: ${deliveredOrders.length}`);
    console.log(`- Total Sales: ₹${totalSales}`);

    if (totalSales === 0 && orders.length > 0) {
        console.log('\n⚠️ WARNING: Orders exist but Total Sales is 0. Check if order status is "Delivered".');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

verifyData();
