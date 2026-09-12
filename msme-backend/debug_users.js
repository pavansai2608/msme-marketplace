const mongoose = require('mongoose');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function debug() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
    
    const users = await mongoose.connection.db.collection('users').find().toArray();
    console.log('--- USERS ---');
    users.forEach(u => console.log(`ID: ${u._id} | Name: ${u.name} | Business: ${u.businessName} | Role: ${u.role}`));

    const products = await mongoose.connection.db.collection('products').find().toArray();
    console.log('\n--- PRODUCTS ---');
    products.forEach(p => {
      const sellerType = typeof p.seller;
      const isObjectId = p.seller instanceof mongoose.Types.ObjectId;
      console.log(`Name: ${p.name} | Category: ${p.category} | Seller: ${p.seller} | Type: ${sellerType} | isObjectId: ${isObjectId}`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

debug();
