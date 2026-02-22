# QA Test Cases: EShop Retail Sales & Distributor Management System

## TC-AUTH: Authentication Tests

### TC-AUTH-001: User Registration
| Field | Detail |
|-------|--------|
| **Objective** | Verify new user registration works correctly |
| **Preconditions** | No existing user with test email |
| **Steps** | 1. POST /api/auth/register with name, email, password, role |
| **Expected** | 201 response with JWT token and user object (no password) |

### TC-AUTH-002: Duplicate Email Registration
| Field | Detail |
|-------|--------|
| **Objective** | Verify system rejects duplicate emails |
| **Preconditions** | User already exists with test email |
| **Steps** | 1. POST /api/auth/register with existing email |
| **Expected** | 400 response with error message |

### TC-AUTH-003: Login with Valid Credentials
| Field | Detail |
|-------|--------|
| **Objective** | Verify successful login returns token |
| **Steps** | 1. POST /api/auth/login with valid email/password |
| **Expected** | 200 response with JWT token and user data |

### TC-AUTH-004: Login with Invalid Password
| Field | Detail |
|-------|--------|
| **Objective** | Verify wrong password is rejected |
| **Steps** | 1. POST /api/auth/login with valid email, wrong password |
| **Expected** | 401 response |

### TC-AUTH-005: Login with Non-existent Email
| Field | Detail |
|-------|--------|
| **Objective** | Verify non-existent email is rejected |
| **Steps** | 1. POST /api/auth/login with unknown email |
| **Expected** | 401 response |

### TC-AUTH-006: Inactive User Login
| Field | Detail |
|-------|--------|
| **Objective** | Verify deactivated users cannot login |
| **Steps** | 1. Deactivate user, 2. POST /api/auth/login |
| **Expected** | 401 response |

### TC-AUTH-007: Access Protected Route Without Token
| Field | Detail |
|-------|--------|
| **Objective** | Verify unauthenticated access is blocked |
| **Steps** | 1. GET /api/auth/me without Authorization header |
| **Expected** | 401 response |

### TC-AUTH-008: Profile Update
| Field | Detail |
|-------|--------|
| **Objective** | Verify profile update works |
| **Steps** | 1. PUT /api/auth/profile with valid token and new name/phone |
| **Expected** | 200 response with updated data |

### TC-AUTH-009: Password Change
| Field | Detail |
|-------|--------|
| **Objective** | Verify password change with correct current password |
| **Steps** | 1. PUT /api/auth/change-password with current and new password |
| **Expected** | 200 response, login works with new password |

### TC-AUTH-010: Password Change with Wrong Current
| Field | Detail |
|-------|--------|
| **Objective** | Verify wrong current password is rejected |
| **Steps** | 1. PUT /api/auth/change-password with wrong current password |
| **Expected** | 401 response |

---

## TC-RBAC: Role-Based Access Control Tests

### TC-RBAC-001: Admin Access to User Management
| Field | Detail |
|-------|--------|
| **Objective** | Admin can access /api/users |
| **Steps** | 1. GET /api/users with admin token |
| **Expected** | 200 response with users list |

### TC-RBAC-002: Distributor Denied User Management
| Field | Detail |
|-------|--------|
| **Objective** | Distributor cannot access /api/users |
| **Steps** | 1. GET /api/users with distributor token |
| **Expected** | 403 Forbidden |

### TC-RBAC-003: Sales Rep Denied User Management
| Field | Detail |
|-------|--------|
| **Objective** | Sales rep cannot access /api/users |
| **Steps** | 1. GET /api/users with sales_rep token |
| **Expected** | 403 Forbidden |

### TC-RBAC-004: Sales Rep Denied Product Creation
| Field | Detail |
|-------|--------|
| **Objective** | Sales rep cannot create products |
| **Steps** | 1. POST /api/products with sales_rep token |
| **Expected** | 403 Forbidden |

### TC-RBAC-005: Sales Rep Denied Retailer Deletion
| Field | Detail |
|-------|--------|
| **Objective** | Sales rep cannot delete retailers |
| **Steps** | 1. DELETE /api/retailers/:id with sales_rep token |
| **Expected** | 403 Forbidden |

### TC-RBAC-006: Data Isolation for Distributors
| Field | Detail |
|-------|--------|
| **Objective** | Distributors only see their own retailers |
| **Steps** | 1. Create retailers for different distributors, 2. GET /api/retailers |
| **Expected** | Only assigned retailers returned |

---

## TC-PROD: Product Management Tests

### TC-PROD-001: Create Product
| Field | Detail |
|-------|--------|
| **Objective** | Admin can create products |
| **Steps** | 1. POST /api/products with full product data |
| **Expected** | 201 response with product data |

### TC-PROD-002: Duplicate SKU Rejected
| Field | Detail |
|-------|--------|
| **Objective** | System enforces unique SKUs |
| **Steps** | 1. Create product, 2. Create another with same SKU |
| **Expected** | 400 response |

### TC-PROD-003: Search Products
| Field | Detail |
|-------|--------|
| **Objective** | Search filters products by name |
| **Steps** | 1. Create products, 2. GET /api/products?search=keyword |
| **Expected** | Only matching products returned |

### TC-PROD-004: Filter by Category
| Field | Detail |
|-------|--------|
| **Objective** | Category filter works |
| **Steps** | 1. GET /api/products?category=beverages |
| **Expected** | Only beverages returned |

### TC-PROD-005: Pagination
| Field | Detail |
|-------|--------|
| **Objective** | Product list supports pagination |
| **Steps** | 1. Create 15 products, 2. GET /api/products?page=1&limit=5 |
| **Expected** | 5 products returned, pagination.total = 15, pages = 3 |

### TC-PROD-006: Negative Price Rejected
| Field | Detail |
|-------|--------|
| **Objective** | Negative prices are rejected |
| **Steps** | 1. POST /api/products with price: -5 |
| **Expected** | 400 validation error |

### TC-PROD-007: Stock Update
| Field | Detail |
|-------|--------|
| **Objective** | Stock can be updated independently |
| **Steps** | 1. PATCH /api/products/:id/stock with { stock: 200 } |
| **Expected** | 200 response with updated stock |

---

## TC-RET: Retailer Management Tests

### TC-RET-001: Create Retailer
| Field | Detail |
|-------|--------|
| **Objective** | Create retailer with full data |
| **Steps** | 1. POST /api/retailers with address, category, tier |
| **Expected** | 201 response, status defaults to 'active' |

### TC-RET-002: Auto-assign for Sales Rep
| Field | Detail |
|-------|--------|
| **Objective** | Retailers created by sales_rep auto-assign |
| **Steps** | 1. POST /api/retailers as sales_rep (no assignedTo) |
| **Expected** | Retailer.assignedTo = salesRep._id |

### TC-RET-003: Invalid Category Rejected
| Field | Detail |
|-------|--------|
| **Objective** | Invalid category enum rejected |
| **Steps** | 1. POST /api/retailers with category: 'invalid' |
| **Expected** | 400 validation error |

### TC-RET-004: Credit Limit Validation
| Field | Detail |
|-------|--------|
| **Objective** | Negative credit limit rejected |
| **Steps** | 1. Create retailer with creditLimit: -100 |
| **Expected** | Validation error |

---

## TC-ORD: Order Lifecycle Tests

### TC-ORD-001: Create Order
| Field | Detail |
|-------|--------|
| **Objective** | Create order with items |
| **Steps** | 1. POST /api/orders with retailer, items array |
| **Expected** | 201 response, orderNumber generated, status = 'pending' |

### TC-ORD-002: Stock Reduction on Order
| Field | Detail |
|-------|--------|
| **Objective** | Product stock decreases after order |
| **Steps** | 1. Note stock, 2. Create order for 5 units, 3. Check stock |
| **Expected** | Stock reduced by 5 |

### TC-ORD-003: Retailer Order Count Update
| Field | Detail |
|-------|--------|
| **Objective** | Retailer totalOrders increments |
| **Steps** | 1. Create order, 2. Check retailer.totalOrders |
| **Expected** | totalOrders = 1 |

### TC-ORD-004: Insufficient Stock Rejected
| Field | Detail |
|-------|--------|
| **Objective** | Cannot order more than available stock |
| **Steps** | 1. Create order with quantity > stock |
| **Expected** | 400 error |

### TC-ORD-005: Valid Status Transition (pending → confirmed)
| Field | Detail |
|-------|--------|
| **Objective** | Valid transitions are allowed |
| **Steps** | 1. PATCH /api/orders/:id/status { status: 'confirmed' } |
| **Expected** | 200, status updated, statusHistory updated |

### TC-ORD-006: Invalid Status Transition (pending → delivered)
| Field | Detail |
|-------|--------|
| **Objective** | Invalid transitions are rejected |
| **Steps** | 1. PATCH /api/orders/:id/status { status: 'delivered' } on pending order |
| **Expected** | 400 error |

### TC-ORD-007: Stock Restoration on Cancellation
| Field | Detail |
|-------|--------|
| **Objective** | Cancelled orders restore product stock |
| **Steps** | 1. Create order (stock reduced), 2. Cancel order, 3. Check stock |
| **Expected** | Stock restored to original level |

### TC-ORD-008: Payment Status Update
| Field | Detail |
|-------|--------|
| **Objective** | Payment status can be updated |
| **Steps** | 1. PATCH /api/orders/:id/payment { paymentStatus: 'paid' } |
| **Expected** | 200, paymentStatus = 'paid' |

### TC-ORD-009: Empty Items Rejected
| Field | Detail |
|-------|--------|
| **Objective** | Orders must have at least one item |
| **Steps** | 1. POST /api/orders with items: [] |
| **Expected** | 400 error |

---

## TC-USER: User Management Tests

### TC-USER-001: List Users (Admin)
| Field | Detail |
|-------|--------|
| **Objective** | Admin can list all users |
| **Steps** | 1. GET /api/users as admin |
| **Expected** | 200 with paginated user list |

### TC-USER-002: Filter by Role
| Field | Detail |
|-------|--------|
| **Objective** | Role filter works |
| **Steps** | 1. GET /api/users?role=distributor |
| **Expected** | Only distributors returned |

### TC-USER-003: Delete User
| Field | Detail |
|-------|--------|
| **Objective** | Admin can delete non-admin users |
| **Steps** | 1. DELETE /api/users/:id |
| **Expected** | 200, user removed from database |

### TC-USER-004: Prevent Last Admin Deletion
| Field | Detail |
|-------|--------|
| **Objective** | System prevents deleting the last admin |
| **Steps** | 1. DELETE /api/users/:adminId (only admin) |
| **Expected** | 400 error |

---

## TC-FE: Frontend Tests

### TC-FE-001: Login Form Rendering
| Field | Detail |
|-------|--------|
| **Objective** | Login page renders all elements |
| **Steps** | 1. Render LoginPage component |
| **Expected** | Email input, password input, submit button, register link visible |

### TC-FE-002: UI Component Rendering
| Field | Detail |
|-------|--------|
| **Objective** | All UI components render correctly |
| **Steps** | 1. Render each UI component with props |
| **Expected** | Components display correct text, apply correct classes |

### TC-FE-003: Helper Function Correctness
| Field | Detail |
|-------|--------|
| **Objective** | Utility functions produce correct output |
| **Steps** | 1. Call formatCurrency, formatDate, getStatusColor, etc. |
| **Expected** | Correct formatted strings and color values returned |

---

## Test Summary

| Category | Total Test Cases | Priority |
|----------|-----------------|----------|
| Authentication | 10 | Critical |
| RBAC | 6 | Critical |
| Products | 7 | High |
| Retailers | 4 | High |
| Orders | 9 | Critical |
| Users | 4 | High |
| Frontend | 3 | Medium |
| **Total** | **43** | |
