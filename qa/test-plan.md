# QA Test Plan: Retail Sales & Distributor Management System (EShop)

## 1. Overview

This document defines the end-to-end QA validation strategy for the EShop application,
covering functional correctness, API reliability, role-based access control (RBAC), and
system performance.

**Application:** EShop - Retail Sales & Distributor Management System  
**Stack:** Node.js/Express backend, React frontend, MongoDB database  
**Test Frameworks:** Jest, Supertest, mongodb-memory-server, React Testing Library

---

## 2. Scope

### In-scope
- User authentication (register, login, JWT token management)
- Role-Based Access Control (admin, distributor, sales_rep)
- CRUD operations for Users, Retailers, Products, Orders
- Order lifecycle (status transitions, stock management, payment tracking)
- Dashboard aggregation and reports
- Frontend component rendering and user interactions
- API input validation and error handling
- Data integrity across related entities

### Out-of-scope
- Load/stress testing (recommend k6 or Artillery for future)
- Browser compatibility testing
- Mobile responsiveness testing
- Third-party integration testing

---

## 3. Test Environment

| Component | Technology | Test Setup |
|-----------|-----------|------------|
| Backend API | Express.js | Supertest + Jest |
| Database | MongoDB | mongodb-memory-server (in-memory) |
| Frontend | React 18 | React Testing Library + Jest |
| Authentication | JWT + bcrypt | Mocked and integration tested |

---

## 4. Test Categories

### 4.1 Unit Tests

**Location:** `backend/tests/unit/`

| Suite | File | Coverage Area |
|-------|------|--------------|
| User Model | `models/User.test.js` | Schema validation, password hashing, JWT generation, JSON transform |
| Product Model | `models/Product.test.js` | Schema validation, SKU uniqueness, margin virtual, defaults |
| Retailer Model | `models/Retailer.test.js` | Schema validation, enum values, defaults, credit limit |
| Auth Middleware | `middleware/auth.test.js` | Token validation, user lookup, role authorization |
| Helpers | `utils/helpers.test.js` | ApiResponse class, asyncHandler wrapper |

### 4.2 Integration Tests (API)

**Location:** `backend/tests/integration/`

| Suite | File | Endpoints Tested |
|-------|------|-----------------|
| Authentication | `auth.test.js` | POST /register, POST /login, GET /me, PUT /profile, PUT /change-password |
| Products | `products.test.js` | GET/POST/PUT/DELETE /products, PATCH /products/:id/stock |
| Retailers | `retailers.test.js` | GET/POST/PUT/DELETE /retailers, role-filtered access |
| Orders | `orders.test.js` | POST /orders, GET /orders, PATCH status/payment, stock management |
| Users (RBAC) | `users.test.js` | GET/PUT/DELETE /users, role restrictions, distributor/rep lists |

### 4.3 Frontend Tests

**Location:** `frontend/src/__tests__/`

| Suite | File | Coverage Area |
|-------|------|--------------|
| UI Components | `components/UI.test.js` | LoadingSpinner, PageHeader, EmptyState, StatCard, Badge, SearchInput |
| Login Page | `pages/LoginPage.test.js` | Form rendering, input handling, demo credentials display |
| Helpers | `utils/helpers.test.js` | Currency formatting, date formatting, status colors, role badges |

---

## 5. RBAC Test Matrix

| Endpoint | Admin | Distributor | Sales Rep | Unauthenticated |
|----------|-------|-------------|-----------|-----------------|
| GET /api/users | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 401 |
| PUT /api/users/:id | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 401 |
| DELETE /api/users/:id | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 401 |
| GET /api/retailers | ✅ All | ✅ Own | ✅ Own | ❌ 401 |
| POST /api/retailers | ✅ 201 | ✅ 201 | ✅ 201 | ❌ 401 |
| DELETE /api/retailers | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 401 |
| GET /api/products | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 401 |
| POST /api/products | ✅ 201 | ✅ 201 | ❌ 403 | ❌ 401 |
| DELETE /api/products | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 401 |
| POST /api/orders | ✅ 201 | ✅ 201 | ✅ 201 | ❌ 401 |
| PATCH /api/orders/:id/status | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 401 |
| GET /api/dashboard | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 401 |
| GET /api/reports/* | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 401 |

---

## 6. Order Status Transition Matrix

| Current State | → pending | → confirmed | → processing | → shipped | → delivered | → cancelled |
|--------------|-----------|-------------|-------------|-----------|------------|-------------|
| pending | - | ✅ | ❌ | ❌ | ❌ | ✅ |
| confirmed | ❌ | - | ✅ | ❌ | ❌ | ✅ |
| processing | ❌ | ❌ | - | ✅ | ❌ | ✅ |
| shipped | ❌ | ❌ | ❌ | - | ✅ | ❌ |
| delivered | ❌ | ❌ | ❌ | ❌ | - | ❌ |
| cancelled | ❌ | ❌ | ❌ | ❌ | ❌ | - |

---

## 7. Test Execution

### Running Backend Tests
```bash
cd backend
npm test                    # Run all tests with coverage
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
```

### Running Frontend Tests
```bash
cd frontend
npm test                    # Run all frontend tests
```

### Running All Tests (Root)
```bash
npm test                    # Runs both backend and frontend tests
```

---

## 8. Coverage Targets

| Category | Target | Measured By |
|----------|--------|-------------|
| Backend Unit Tests | > 80% line coverage | Jest --coverage |
| Backend Integration Tests | All API endpoints covered | Route-level verification |
| RBAC Enforcement | 100% of role-restricted routes | Auth middleware tests |
| Frontend Components | Core UI components tested | React Testing Library |
| Input Validation | All validator chains tested | Integration test assertions |

---

## 9. Defect Classification

| Severity | Description | Example |
|----------|-------------|---------|
| Critical | System crash, data loss, auth bypass | JWT verification failure |
| High | Feature broken, incorrect data | Order totals miscalculated |
| Medium | Functional with workaround | Search filter not working |
| Low | Cosmetic or minor UX issue | Incorrect badge color |

---

## 10. Test Data Strategy

- **In-memory MongoDB**: All tests use `mongodb-memory-server` for isolated, disposable databases
- **Setup/Teardown**: Each test suite creates its own data via `beforeEach`, cleans up via `afterEach`
- **Seed Data**: `backend/src/seeds/seed.js` provides realistic demo data for manual testing
- **No shared state**: Tests are independent and can run in any order

---

## 11. Acceptance Criteria

1. All unit tests pass with > 80% code coverage
2. All API integration tests pass
3. RBAC is enforced on every protected endpoint
4. Order status transitions follow the defined state machine
5. Stock levels are correctly adjusted on order creation/cancellation
6. Frontend components render without errors
7. Authentication flow (register → login → access → logout) works end-to-end
8. Input validation rejects malformed data with appropriate error messages
