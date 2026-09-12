const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');

dotenv.config();

const seedAnalytics = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('MongoDB Connected for seeding...');

        const sellerId = '69e1376aebc83739c7ebb268';
        const buyerId = '69e137bcebc83739c7ebb2aa'; // Using another user as buyer

        // Get seller products
        const products = await Product.find({ seller: sellerId });
        if (products.length === 0) {
            console.log('No products found for this seller. Please add products first.');
            process.exit(1);
        }

        console.log(`Found ${products.length} products for seller ${sellerId}`);

        // Clear existing orders for this seller to have a clean slate (optional)
        // await Order.deleteMany({ 'products.seller': sellerId });

        const orders = [];
        const now = new Date();

        // Create random orders for the last 6 months
        for (let i = 0; i < 100; i++) {
            const orderDate = new Date();
            orderDate.setDate(now.getDate() - Math.floor(Math.random() * 180)); // Random date in last 180 days

            // Pick 1-3 random products from seller
            const numProducts = Math.floor(Math.random() * 3) + 1;
            const selectedProducts = [];
            let totalAmount = 0;

            for (let j = 0; j < numProducts; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const qty = Math.floor(Math.random() * 5) + 1;
                const size = product.sizes[Math.floor(Math.random() * product.sizes.length)].size;
                
                selectedProducts.push({
                    product: product._id,
                    quantity: qty,
                    size: size,
                    price: product.price,
                    seller: sellerId
                });
                totalAmount += product.price * qty;
            }

            orders.push({
                buyer: buyerId,
                products: selectedProducts,
                totalAmount: totalAmount,
                shippingAddress: {
                    street: '123 Market Road',
                    city: 'Hyderabad',
                    state: 'Telangana',
                    pincode: '500001',
                    phone: '9876543210'
                },
                status: 'Delivered',
                paymentStatus: 'Completed',
                createdAt: orderDate
            });
        }

        await Order.insertMany(orders);
        console.log(`${orders.length} historical orders seeded successfully!`);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAnalytics();
