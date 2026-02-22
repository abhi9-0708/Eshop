# Retail Sales & Distributor Management System

## Overview
A comprehensive web application for field sales representatives and distributors to manage retailers, create orders, and track sales performance.

## Tech Stack
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT Auth
- **Frontend**: React 18, React Router, Axios, Chart.js, Tailwind CSS
- **Testing**: Jest, Supertest, React Testing Library, Cypress (E2E)

## Project Structure
```
Eshop/
├── backend/                 # Express API Server
│   ├── src/
│   │   ├── config/          # DB, environment config
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/       # Auth, RBAC, validation
│   │   ├── controllers/     # Business logic
│   │   ├── services/        # Service layer
│   │   ├── utils/           # Helpers
│   │   └── seeds/           # Database seeders
│   ├── tests/               # Backend test suites
│   │   ├── unit/
│   │   ├── integration/
│   │   └── api/
│   └── server.js
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── context/         # React Context (Auth, App state)
│   │   ├── services/        # API client services
│   │   ├── hooks/           # Custom hooks
│   │   └── utils/           # Helpers
│   └── tests/               # Frontend test suites
├── qa/                      # QA Documentation & Plans
│   ├── test-plan.md
│   ├── test-cases.md
│   └── performance/
└── README.md
```

## Roles & Access Control
| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, manage users, view all reports |
| **Distributor** | Manage own retailers, view own orders/reports |
| **Sales Rep** | Create orders, visit retailers, log activities |

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### Installation
```bash
npm run install:all
```

### Configuration
Copy `.env.example` to `.env` in the backend folder and update values.

### Seed Database
```bash
npm run seed
```

### Development
```bash
npm run dev          # Start both backend & frontend
npm run dev:backend  # Backend only (port 5000)
npm run dev:frontend # Frontend only (port 3000)
```

### Testing
```bash
npm run test:all     # Run all tests
npm run test:backend # Backend tests only
npm run test:frontend # Frontend tests only
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users (Admin)
- `GET /api/users` - List users
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Retailers
- `GET /api/retailers` - List retailers
- `POST /api/retailers` - Create retailer
- `GET /api/retailers/:id` - Get retailer
- `PUT /api/retailers/:id` - Update retailer
- `DELETE /api/retailers/:id` - Delete retailer

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `PUT /api/orders/:id/status` - Update order status

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Dashboard / Reports
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/reports/sales` - Sales reports
- `GET /api/reports/performance` - Performance reports
