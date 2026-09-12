const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');

async function checkProductSizes() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to DB');
        
        const products = await Product.find({});
        console.log(`Found ${products.length} products`);
        
        products.forEach(p => {
            const size = JSON.stringify(p).length;
            console.log(`Product: ${p.name}, ID: ${p._id}, Size: ${(size / 1024).toFixed(2)} KB`);
            if (p.images && p.images.length > 0) {
                console.log(`  Images count: ${p.images.length}`);
                p.images.forEach((img, i) => {
                    console.log(`  - Image ${i} length: ${img.length} chars`);
                });
            }
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProductSizes();
