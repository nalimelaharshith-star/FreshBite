# 🌿 FreshBite Backend

Node.js + Express + MongoDB REST API for FreshBite ecommerce.

---

## 📁 Project Structure

```
freshbite-backend/
├── models/
│   ├── User.js          User accounts, addresses, notifications
│   ├── Product.js       Product catalog
│   ├── Order.js         Orders with status history
│   └── Review.js        Product reviews
├── routes/
│   ├── auth.js          Register, login, social login, address, notifications
│   ├── products.js      Full product CRUD + search
│   ├── orders.js        Place orders, track, update status, analytics
│   ├── users.js         Admin user management (ban, role change)
│   └── reviews.js       Reviews — add, moderate, delete
├── middleware/
│   └── auth.js          JWT protect, adminOnly, optionalAuth
├── scripts/
│   └── seed.js          Seed DB with 12 products + admin user
├── server.js            Main entry point
├── .env.example         Environment variable template
└── package.json
```

---

## 🚀 Setup (Step by Step)

### 1. Install Node.js
Download from nodejs.org → install LTS version.  
Verify: `node --version` should show v18+ or v20+

### 2. Install dependencies
```bash
cd freshbite-backend
npm install
```

### 3. Set up MongoDB Atlas (free)
1. Go to cloud.mongodb.com → Sign up free
2. Create a cluster → choose FREE (M0) → region: Mumbai
3. Database Access → Add User → username: `freshbite_admin`, strong password
4. Network Access → Add IP → Allow from Anywhere (0.0.0.0/0)
5. Connect → Drivers → copy the connection string

### 4. Create your .env file
```bash
cp .env.example .env
```
Then open `.env` and fill in:
- `MONGO_URI` — your MongoDB Atlas connection string (replace <password>)
- `JWT_SECRET` — any long random string (e.g. `freshbite_secret_abc123xyz`)
- `PORT` — 5000 for local, 10000 for Render.com
- `CLIENT_URL` — your Netlify URL

### 5. Seed the database
```bash
npm run seed
```
This creates 12 products + admin user (admin@freshbite.com / admin123)

### 6. Start the server
```bash
npm run dev        # development (auto-restarts on file change)
npm start          # production
```

Server runs at: http://localhost:5000  
Test it: http://localhost:5000/api/products

---

## 🌐 Deploy on Render.com (Free)

1. Push this folder to a GitHub repo
2. Go to render.com → New → Web Service → connect your repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add Environment Variables (same as your .env):
   - MONGO_URI
   - JWT_SECRET
   - PORT = 10000
   - CLIENT_URL = your Netlify URL
6. Deploy → your API will be live at `https://freshbite-api.onrender.com`

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new account |
| POST | /api/auth/login | Sign in, get token |
| POST | /api/auth/social | Google/Facebook login |
| GET | /api/auth/me | Get current user (auth) |
| PUT | /api/auth/address | Save delivery address (auth) |
| PUT | /api/auth/notifications | Update notification prefs (auth) |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | All products (public) |
| GET | /api/products/search?q=choco | Autocomplete search |
| GET | /api/products/:id | Single product |
| POST | /api/products | Add product (admin) |
| PUT | /api/products/:id | Edit product (admin) |
| PATCH | /api/products/:id/stock | Update stock (admin) |
| PATCH | /api/products/:id/feat | Toggle featured (admin) |
| DELETE | /api/products/:id | Remove product (admin) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/orders | Place order (auth) |
| GET | /api/orders/my | My order history (auth) |
| GET | /api/orders/:id | Single order (auth) |
| GET | /api/orders | All orders (admin) |
| GET | /api/orders/analytics | Sales analytics (admin) |
| PATCH | /api/orders/:id/status | Update status (admin) |
| POST | /api/orders/:id/refund | Refund order (admin) |

### Users (admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | All users |
| GET | /api/users/:id | User + their orders |
| PATCH | /api/users/:id/role | Change role |
| PATCH | /api/users/:id/ban | Ban / unban |
| DELETE | /api/users/:id | Delete permanently |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reviews/:productId | Product reviews (public) |
| POST | /api/reviews/:productId | Add review (auth) |
| PATCH | /api/reviews/:id/approve | Hide/show review (admin) |
| DELETE | /api/reviews/:id | Delete review (admin/own) |

---

## 🔑 Authentication

All protected routes need this header:
```
Authorization: Bearer <your_jwt_token>
```

Token is returned on login/register. Store it in localStorage:
```javascript
localStorage.setItem('fb_token', data.token);
```

---

## 🔄 Connecting Frontend (FreshBite-v4.html)

Add at the top of the script section in your HTML:
```javascript
const API = 'https://freshbite-api.onrender.com/api';
// For local dev: const API = 'http://localhost:5000/api';

// Helper — always include auth token in requests
const authFetch = (url, opts = {}) => fetch(API + url, {
  ...opts,
  headers: {
    'Content-Type': 'application/json',
    ...(localStorage.getItem('fb_token')
      ? { Authorization: 'Bearer ' + localStorage.getItem('fb_token') }
      : {}),
    ...opts.headers
  }
});
```

Then replace localStorage calls with API calls — see the full integration guide.
