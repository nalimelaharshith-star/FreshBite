// ─────────────────────────────────────────────
//  scripts/seed.js
//  Populates MongoDB with admin user + 12 products
//  Run with:  npm run seed
// ─────────────────────────────────────────────
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Product  = require('../models/Product');

const products = [
  { name:'Choco Chip Cookies', desc:'Belgian dark chocolate chips baked into soft, gooey cookies. Made fresh every morning.', price:280, orig:350, cat:'cookies', emoji:'🍪', img:'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&q=80', unit:'250g pack · ~10 cookies', feat:true,  rating:4.8, stock:48 },
  { name:'Organic Baby Spinach', desc:'Tender baby spinach leaves, certified organic. Harvested at dawn and delivered within 24 hours.', price:45, cat:'vegetables', emoji:'🥬', img:'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80', unit:'250g bunch', feat:true, rating:4.7, stock:180 },
  { name:'Oatmeal Raisin Cookies', desc:'Hearty oatmeal cookies loaded with plump raisins, brown sugar, and warming cinnamon.', price:260, orig:320, cat:'cookies', emoji:'🍪', img:'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80', unit:'200g pack · ~8 cookies', feat:true, rating:4.6, stock:28 },
  { name:'Cherry Tomatoes', desc:'Sweet vine-ripened cherry tomatoes bursting with natural sugars.', price:80, cat:'vegetables', emoji:'🍅', img:'https://images.unsplash.com/photo-1546543104-c612d7d5faef?w=500&q=80', unit:'500g punnet', feat:true, rating:4.9, stock:145 },
  { name:'Almond Delight Cookies', desc:'Delicate almond-flour cookies with crisp edges and a melt-in-mouth centre.', price:320, cat:'cookies', emoji:'🍪', img:'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80', unit:'150g pack · ~6 cookies', feat:false, rating:4.8, stock:35 },
  { name:'Fresh Broccoli', desc:'Crispy broccoli florets harvested at peak freshness. Rich in vitamin C.', price:85, cat:'vegetables', emoji:'🥦', img:'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=500&q=80', unit:'500g crown', feat:false, rating:4.5, stock:92 },
  { name:'Peanut Butter Cookies', desc:'Rich, nutty cookies made with 100% natural peanut butter. High-protein.', price:300, cat:'cookies', emoji:'🍪', img:'https://images.unsplash.com/photo-1553978297-23ab4f0c94ac?w=500&q=80', unit:'200g pack · ~8 cookies', feat:false, rating:4.7, stock:22 },
  { name:'Mixed Bell Peppers', desc:'Colourful red, yellow and green bell peppers. Sweet and crunchy.', price:60, cat:'vegetables', emoji:'🫑', img:'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&q=80', unit:'250g mix (3 colours)', feat:false, rating:4.6, stock:75 },
  { name:'Dark Chocolate Biscotti', desc:'Twice-baked Italian-style biscotti dipped in rich dark chocolate.', price:340, orig:400, cat:'cookies', emoji:'🍫', img:'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=500&q=80', unit:'180g tin · 12 pieces', feat:false, rating:4.9, stock:20 },
  { name:'Farm Fresh Carrots', desc:'Bright orange carrots pulled fresh every morning. Crunchy and sweet.', price:40, cat:'vegetables', emoji:'🥕', img:'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500&q=80', unit:'500g bunch', feat:false, rating:4.7, stock:210 },
  { name:'Lemon Shortbread', desc:'Classic shortbread with bright lemon zest. Buttery and refreshingly citrusy.', price:290, cat:'cookies', emoji:'🍋', img:'https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=500&q=80', unit:'200g box · ~10 pieces', feat:false, rating:4.5, stock:30 },
  { name:'Baby Cucumber', desc:'Tender mini cucumbers, perfect for snacking, salads, and pickling.', price:55, cat:'vegetables', emoji:'🥒', img:'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=500&q=80', unit:'250g pack (6-8 cucumbers)', feat:false, rating:4.6, stock:120 }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Connected to MongoDB');

    // Clear existing data
    await Product.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️   Cleared existing products and users');

    // Insert products
    const created = await Product.insertMany(products);
    console.log(`📦  Inserted ${created.length} products`);

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@freshbite.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      avatar: 'AD'
    });
    console.log(`🔐  Admin created: ${admin.email}`);

    // Create demo customer
    const demo = await User.create({
      name: 'Demo Customer',
      email: 'user@freshbite.com',
      password: 'user123',
      role: 'user',
      avatar: 'DC'
    });
    console.log(`👤  Demo user created: ${demo.email}`);

    console.log('\n✅  Seed complete! You can now start the server with: npm run dev');
    process.exit(0);

  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
