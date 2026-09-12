const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb+srv://chakriparella666:T8f8mIdcbe3OQyvF@cluster0.4ifc8lf.mongodb.net/msme_db?retryWrites=true&w=majority&appName=Cluster0');
    
    // Find a seller
    const user = await User.findOne({ role: 'seller' });
    if (!user) {
        console.log('No seller found');
        return;
    }
    console.log('Checking for seller:', user.name, user._id);

    const orders = await Order.find({ 'products.seller': user._id, status: 'Delivered' });
    console.log('Total Delivered Orders:', orders.length);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const currentMonthOrders = orders.filter(o => o.createdAt >= startOfMonth && o.createdAt <= endOfMonth);
    console.log('Orders in April 2026:', currentMonthOrders.length);

    mongoose.disconnect();
}

check();
