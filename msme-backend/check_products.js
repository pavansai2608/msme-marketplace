const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    const products = await mongoose.connection.db.collection('products').find().toArray();
    console.log('--- PRODUCTS IN msme_db ---');
    products.forEach(p => console.log(`Name: ${p.name}, Seller: ${p.seller}`));
    console.log(`Total: ${products.length}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit();
  }
}
check();
