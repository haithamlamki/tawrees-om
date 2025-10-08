# Tawreed WMS User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Customer Portal](#customer-portal)
3. [Admin Dashboard](#admin-dashboard)
4. [Common Tasks](#common-tasks)
5. [Troubleshooting](#troubleshooting)

## Getting Started

### Creating an Account
1. Navigate to the warehouse login page: `/warehouse/auth`
2. Click "Sign Up" or "Create Account"
3. Fill in required information:
   - Email address
   - Password (minimum 8 characters)
   - Company name
   - Contact details
4. Submit the form
5. You'll be automatically logged in (email confirmation is disabled for ease of use)

### First Login
After creating your account:
1. Complete your profile settings
2. Review warehouse contract terms
3. Set notification preferences
4. Add delivery addresses

## Customer Portal

### Dashboard Overview
The customer dashboard shows:
- **Active Orders**: Current orders in progress
- **Recent Invoices**: Latest billing information
- **Inventory Summary**: Stock levels and alerts
- **Quick Actions**: Common tasks

### Managing Orders

#### Creating a New Order
1. Go to **Orders** > **New Order**
2. Fill in order details:
   - Delivery address
   - Delivery city
   - Special instructions (optional)
3. Add order items:
   - Select products from inventory
   - Enter quantities
   - Review pricing
4. Submit order for approval
5. Order status: `pending_approval`

#### Order Status Flow
```
pending_approval → approved → in_progress → delivered → completed
```

At any stage, orders can be cancelled (status: `cancelled`)

#### Tracking Orders
1. Go to **Orders** page
2. Click on any order to view details
3. See current status and timeline
4. View delivery information
5. Track location updates (if assigned to driver)

### Managing Inventory

#### Viewing Inventory
1. Navigate to **Inventory** page
2. View all your stored products
3. Filter by:
   - Product name
   - Stock level
   - Category
4. Sort by various columns

#### Low Stock Alerts
- Products below minimum quantity show **Low Stock** badge
- Automatic reorder alerts
- Email notifications (if enabled)

#### Inventory Actions
- **View Details**: See full product information
- **Request Reorder**: Create order to replenish stock
- **View History**: See consumption over time

### Managing Invoices

#### Viewing Invoices
1. Go to **Invoices** page
2. See all invoices with:
   - Invoice number
   - Date
   - Amount
   - Status (draft/sent/paid/overdue)

#### Invoice Actions
- **View Details**: See itemized breakdown
- **Download PDF**: Get printable invoice
- **Pay Online**: Process payment (if enabled)
- **Email Invoice**: Send to accounting

#### Understanding Invoice Status
- **Draft**: Not yet finalized
- **Sent**: Awaiting payment
- **Paid**: Payment received
- **Overdue**: Past due date

### Reports and Analytics

#### Available Reports
1. **Order History Report**
   - Date range selection
   - Export to CSV/Excel
   - Filter by status

2. **Inventory Report**
   - Current stock levels
   - Consumption trends
   - Reorder recommendations

3. **Financial Report**
   - Invoice summaries
   - Payment history
   - Outstanding balances

## Admin Dashboard

### Overview
Admins have access to:
- **All customer data**
- **Order approvals**
- **Inventory management**
- **Invoice generation**
- **MIS reports**
- **System settings**

### Customer Management

#### Adding New Customers
1. Go to **Admin** > **Customers**
2. Click **Add Customer**
3. Fill in:
   - Company name
   - Customer code (unique)
   - Contact information
   - Contract terms
4. Set warehouse preferences
5. Save customer

#### Managing Customers
- View all customer accounts
- Edit customer details
- Deactivate/reactivate customers
- View customer statistics

### Order Management

#### Approving Orders
1. Go to **Admin** > **Orders**
2. Filter by `pending_approval`
3. Review order details
4. Check inventory availability
5. Click **Approve** or **Reject**
6. Add approval notes (optional)

**Important**: Approving an order:
- Deducts inventory quantities
- Cannot be undone
- Generates audit log

#### Assigning Drivers
1. View order details
2. Click **Assign Driver**
3. Select available driver
4. Add delivery instructions
5. Driver receives notification

### Inventory Management

#### Adding Inventory
1. Go to **Admin** > **Inventory**
2. Click **Add Item**
3. Enter product details:
   - Product name
   - SKU/Product code
   - Initial quantity
   - Price per unit
   - Minimum quantity (reorder point)
4. Assign to customer
5. Save

#### Bulk Import
1. Download Excel template
2. Fill in product data
3. Upload file
4. Review import results
5. Confirm import

### Invoice Management

#### Generating Invoices
Invoices are automatically generated when:
- Order is approved
- Manual invoice creation

#### Invoice Generation Process
1. Go to **Admin** > **Invoice Generator**
2. Select customer
3. Select order
4. Review line items
5. Adjust if needed
6. Generate invoice
7. Invoice number auto-assigned

#### Sending Invoices
1. View invoice details
2. Click **Send Email**
3. Confirm recipient email
4. Email sent with PDF attachment

### MIS Reports

#### Accessing MIS Report
Go to **Admin** > **MIS Report**

#### Available Metrics
1. **Overview Tab**
   - Total revenue
   - Total orders
   - Inventory value
   - Active customers
   - Revenue trend chart
   - Orders by status chart

2. **Revenue Analysis**
   - Monthly breakdown
   - Trend analysis

3. **Order Analytics**
   - Status distribution
   - Order volume trends

4. **Inventory Status**
   - Distribution by customer
   - Stock levels

5. **Customer Insights**
   - Top 10 customers by revenue
   - Customer activity

#### Filtering Reports
- Set date range (from/to)
- Filter by customer
- Export to PDF/Excel

## Common Tasks

### How to Check Order Status
1. Login to customer portal
2. Go to **Orders**
3. Find your order by order number
4. Click to view details
5. See current status and timeline

### How to Download Invoice
1. Go to **Invoices**
2. Find invoice
3. Click **Download PDF**
4. PDF opens in new tab or downloads

### How to Update Profile
1. Go to **Settings**
2. Update information:
   - Contact details
   - Company information
   - Password
   - Notification preferences
3. Save changes

### How to Add Delivery Address
1. Go to **Settings** > **Addresses**
2. Click **Add Address**
3. Fill in address details
4. Mark as default (optional)
5. Save

### How to Request Product
1. Go to **Product Requests**
2. Click **New Request**
3. Fill in product details:
   - Product name
   - Description
   - Quantity needed
   - Expected delivery date
4. Submit request
5. Admin will review and respond

## Troubleshooting

### Login Issues
- **Forgot Password**: Click "Forgot Password" on login page
- **Account Locked**: Contact administrator
- **Email Not Received**: Check spam folder, ensure auto-confirm is enabled

### Order Issues
- **Order Stuck in Pending**: Contact admin for approval status
- **Cannot Create Order**: Check if you have active inventory
- **Missing Items**: Verify inventory availability

### Invoice Issues
- **Invoice Not Generated**: Order must be approved first
- **Wrong Amount**: Contact admin to correct invoice
- **Payment Issues**: Contact accounting department

### Performance Issues
- **Slow Loading**: Check internet connection, clear browser cache
- **Page Not Loading**: Try refreshing, check console for errors
- **Data Not Updating**: Refresh page, check real-time connection

### Getting Help
- **In-App Support**: Click help icon (?)
- **Email Support**: support@tawreed.com
- **Phone Support**: [Your phone number]
- **Documentation**: This guide and online help

## Best Practices

### For Customers
1. **Check inventory regularly** for low stock alerts
2. **Place orders in advance** to ensure availability
3. **Keep delivery addresses updated**
4. **Review invoices promptly**
5. **Enable email notifications** for important updates

### For Admins
1. **Review pending orders daily**
2. **Monitor inventory levels** across all customers
3. **Generate reports weekly** for analysis
4. **Keep customer information current**
5. **Respond to product requests promptly**
6. **Review security logs regularly**

## Keyboard Shortcuts

### Global
- `Ctrl/Cmd + K`: Search
- `Ctrl/Cmd + /`: Toggle sidebar
- `Escape`: Close dialogs

### Navigation
- `G + D`: Go to Dashboard
- `G + O`: Go to Orders
- `G + I`: Go to Inventory
- `G + V`: Go to Invoices

## Glossary

- **WMS**: Warehouse Management System
- **RLS**: Row Level Security (data isolation)
- **SKU**: Stock Keeping Unit (product identifier)
- **CBM**: Cubic Meter (volume measurement)
- **POD**: Proof of Delivery
- **ETA**: Estimated Time of Arrival
- **MIS**: Management Information System

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**For Questions**: Contact your system administrator
