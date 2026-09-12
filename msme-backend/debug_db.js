const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URL);
  const products = await mongoose.model('Product', new mongoose.Schema({ seller: mongoose.Schema.Types.ObjectId, name: String })).find();
  console.log('--- PRODUCTS ---');
  products.forEach(p => console.log(`Name: ${p.name}, SellerID: ${p.seller}, ProductID: ${p._id}`));
  
  const users = await mongoose.model('User', new mongoose.Schema({ name: String })).find();
  console.log('\n--- USERS ---');
  users.forEach(u => console.log(`Name: ${u.name}, ID: ${u._id}`));
  
  process.exit();
}
check();
