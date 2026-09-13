# MSME Platform - AI-Enabled District-Level Marketplace

An advanced and  AI-powered e-commerce and operational platform designed to empower Micro, Small, and Medium Enterprises (MSMEs) by providing them with the tools needed to scale their businesses from local hubs to global markets.

## 🚀 Overview

The MSME Platform is a full-stack MERN application that serves as a district-level aggregation hub. It doesn't just facilitate buying and selling; it provides sellers with actionable data-driven insights through demand forecasting, production advisory, and streamlined logistics.

## ✨ Key Features

### 🏪 Marketplace
- **Buyer Dashboard**: Detailed product discovery with categories, wishlist functionality, and a seamless checkout process.
- **Seller Hub**: Comprehensive inventory management, product listing, and real-time order status updates.

### 🧠 AI & Analytics
- **Demand Forecasting**: Predictive analytics to help sellers understand upcoming trends and optimize production.
- **Sales Visualization**: Dynamic charts using **Recharts** to visualize revenue, sales volume, and growth patterns.
- **Production Advisory**: AI-driven suggestions for inventory replenishment and operational efficiency.

### 🚛 Logistics & Operations
- **Logistics Integration**: Integrated with **Shiprocket** (mocked/real) for carrier assignment, shipment tracking, and delivery management.
- **PWA (Progressive Web App)**: Mobile-first design with offline support, installable on any device for a native experience.

### 💰 Financials & Support
- **Govt Scheme Discovery**: Automated discovery tool for government subsidies and MSME schemes.
- **Micro-Loans**: Access to financial service modules for quick credit and loan disbursements.

### 🔒 Security & Auth
- **Secure Authentication**: JWT-based session management and **Google OAuth 2.0** integration.
- **Middleware**: Enhanced security using **Helmet**, **CORS** policies, and request validation.

## 🛠️ Tech Stack

**Frontend:**
- React.js (Vite)
- Framer Motion (Animations)
- Recharts (Data Visualization)
- Tailwind CSS (Styling)

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose (Database)
- Passport.js (Authentication)

**Deployment & DevOps:**
- Git/GitHub (Version Control)
- Vercel (Frontend Hosting)
- Render (Backend Hosting)

## 📦 Project Structure

```text
├── msme-backend/       # Express.js server, API routes, models, and controllers
├── msme-frontend/      # React (Vite) application, components, and styles
├── .gitignore          # Git exclusion rules
└── README.md           # Project documentation
```

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account or Local MongoDB Instance

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd msme-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and add your configuration:
   ```env
   PORT=5000
   MONGO_URL=your_mongodb_uri
   JWT_SECRET=your_secret_key
   GOOGLE_CLIENT_ID=your_id
   GOOGLE_CLIENT_SECRET=your_secret
   SHIPROCKET_EMAIL=your_email
   SHIPROCKET_PASSWORD=your_password
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd msme-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🖥️ Quick Server Start

To start the full application locally:

1. **Start MongoDB** (ensure it's running locally or via a service).
2. **Start the Backend:**
   ```bash
   cd msme-backend
   npm install   # if not already installed
   npm start
   ```
   The backend will run on `http://localhost:5000` by default.
3. **Start the Frontend:**
   ```bash
   cd msme-frontend
   npm install   # if not already installed
   npm run dev
   ```
   The frontend will run on `http://localhost:3001` by default.

## 👑 Creating an Admin

There is **no HTTP route that can grant the admin role**. `/api/auth/update-profile`
strips `role` out of the request body and `/api/auth/become-seller` hardcodes
`'seller'`, so the role cannot be reached by any request a client can make.

The only way to create one is the seeding script, run against the database
directly:

```bash
cd msme-backend
node scripts/seedAdmin.js someone@example.com
```

The account **must already exist** - register through the app first, then
promote that email. The script also forces `isActive: true`, since a suspended
admin would be promoted and then blocked at the door by `verifyToken`.

Sign out and back in afterwards for an already-open session to pick up the new
role in the UI. (The server reads the role from the database on every request,
so the API grants admin access immediately; it is only the cached user object
in the browser that is stale.)

### Admin endpoints

All four sit behind `verifyToken` + `requireRole('admin')` and answer 403 for
anyone else:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/admin/stats` | User counts by role, product count, order count, total revenue, orders in the last 7 days |
| GET | `/api/admin/users` | Paginated user list; `?search=` matches name and email, `?page=`, `?limit=` (max 100), `?role=` |
| PATCH | `/api/admin/users/:id/status` | Body `{ "isActive": true \| false }` - activate or deactivate an account |
| GET | `/api/admin/orders` | Paginated order list; `?status=` filters on the Order status enum |

`totalRevenue` is the sum of `totalAmount` across every order **except**
`Cancelled` ones, including orders still in flight.

Deactivating a user takes effect on their **next request**: `verifyToken` reads
`isActive` from the database each time and answers 403 `account_inactive`, so
an access token already in their browser stops working without waiting for its
15-minute expiry. An admin cannot deactivate their own account - that would
lock every admin route behind a 403 with nobody left to lift it.

## 🌐 HTTPS Usage Note

This codebase integrates with several third-party APIs and services that communicate over **HTTPS** (e.g., Shiprocket API, Nominatim OpenStreetMap, Google OAuth, and npm registry packages). While the local development servers run on HTTP, ensure that all external API keys and environment variables are configured securely for production deployments.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
