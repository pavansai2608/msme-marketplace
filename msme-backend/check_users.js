const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    const users = await mongoose.connection.db.collection('users').find().toArray();
    console.log('--- USERS IN msme_db ---');
    users.forEach(u => console.log(`Name: ${u.name}, ID: ${u._id}`));
    console.log(`Total: ${users.length}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit();
  }
}
check();
