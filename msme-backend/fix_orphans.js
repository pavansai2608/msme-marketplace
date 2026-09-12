const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 5000
    });
    const Product = mongoose.model('Product', new mongoose.Schema({ seller: mongoose.Schema.Types.ObjectId }));
    
    // Find all products where seller is missing or null
    const res = await Product.updateMany(
      { $or: [{ seller: { $exists: false } }, { seller: null }] }, 
      { $set: { seller: '69d623eded3efd59a8a64c61' } }
    );
    
    console.log(`✅ Fixed ${res.modifiedCount} orphaned products.`);
  } catch (err) {
    console.error('❌ Error fixing orphans:', err.message);
  } finally {
    process.exit();
  }
}
fix();
