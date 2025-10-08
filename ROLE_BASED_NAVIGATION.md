# Role-Based Navigation

This document describes what pages are available to each user role in the system.

## Role Hierarchy

The system detects roles in this priority order:
1. **admin** - Full system access
2. **employee** - Employee dashboard access
3. **shipping_partner** - Partner dashboard and locations
4. **accountant** - Finance dashboard access
5. **branch_manager** - WMS branch management
6. **store_customer** - WMS customer portal
7. **user** - Basic user access

## Available Pages by Role

### 🔵 Regular User / Customer
**Pages:**
- Home
- Dashboard
- Locations
- Rates

---

### 🟢 Store Customer (WMS Customer)
**Pages:**
- **Main:**
  - Home
  - Dashboard
  - Locations
  - Rates

- **WMS:**
  - WMS Dashboard
  - Contract
  - Inventory
  - Orders
  - Invoices
  - Reports
  - Branches
  - Product Requests
  - Settings

---

### 🟡 Branch Manager
**Pages:**
- **Main:**
  - Home
  - Dashboard
  - Locations
  - Rates

- **WMS:**
  - WMS Dashboard
  - Inventory
  - Orders
  - Branches
  - Product Requests

---

### 🟣 Employee
**Pages:**
- **Main:**
  - Home
  - Dashboard
  - Locations
  - Rates

- **Employee:**
  - Employee Dashboard

---

### 🟠 Shipping Partner
**Pages:**
- **Main:**
  - Home
  - Locations

- **Partner:**
  - Partner Dashboard
  - Partner Locations

---

### 💰 Accountant / Finance
**Pages:**
- **Main:**
  - Home
  - Dashboard
  - Locations
  - Rates

- **Finance:**
  - Finance Dashboard

---

### 🔴 Admin (Full Access)
**Pages:**

- **Main:**
  - Home
  - Dashboard
  - Locations
  - Rates

- **Admin:**
  - Admin Dashboard
  - Analytics
  - Products
  - Quote Management
  - Product Approvals
  - Admin Locations

- **Admin WMS:**
  - WMS Dashboard
  - Customers
  - Customer Orders
  - Contracts
  - Inventory
  - Orders
  - Invoices
  - Drivers
  - Workflow Settings
  - MIS Report

- **Employee:**
  - Employee Dashboard

- **Partner:**
  - Partner Dashboard
  - Partner Locations

- **Finance:**
  - Finance Dashboard

---

## How It Works

1. When a user logs in, the system fetches their roles from the `user_roles` table
2. The AppLayout component determines the primary role based on priority order
3. The WMSNavigation component filters and groups navigation items based on the user's role
4. Only pages the user has permission to access are shown in the sidebar

## Adding New Pages

To add a new page to the navigation:

1. Add the route in `src/App.tsx`
2. Add the navigation item in `src/components/WMSNavigation.tsx`:
   ```typescript
   {
     name: "Page Name",
     href: "/path",
     icon: IconComponent,
     roles: ["role1", "role2"],
     group: "Group Name"
   }
   ```

## Security Notes

⚠️ **Important:** The sidebar navigation is UI-level filtering only. Each route must have proper authentication and authorization checks to prevent unauthorized access:

- Use RLS (Row-Level Security) policies in Supabase
- Implement route guards in layouts
- Verify user roles before showing sensitive data
- Never rely on client-side checks alone for security
