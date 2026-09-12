const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/msme');
    console.log('Connected to MongoDB');

    // 1. Fix SKUs and Prices
    const products = await Product.find();
    for (let p of products) {
      let updated = false;
      if (!p.sku || p.sku === 'N/A') {
        p.sku = 'MSME-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        updated = true;
      }
      // If price is 0, set a default for demo or log it
      if (p.price === 0) {
        p.price = 5999; // Default price for furniture example
        updated = true;
      }
      
      // Ensure rawMaterials is an array
      if (!p.rawMaterials) {
        p.rawMaterials = [];
        updated = true;
      }

      if (updated) {
        await p.save();
        console.log(`Updated product: ${p.name} | SKU: ${p.sku} | Price: ${p.price}`);
      }
    }

    // 2. Clear out any old fake data in Orders if needed
    // (Optional: can also cleanup orders with 0 totalAmount)
    
    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
