// WMS Application with Authentication
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import PartnerDashboard from "./pages/PartnerDashboard";
import FinanceDashboard from "./pages/FinanceDashboard";
import Tracking from "./pages/Tracking";
import Locations from "./pages/Locations";
import Rates from "./pages/Rates";
import NotFound from "./pages/NotFound";
import AdminProducts from "./pages/admin/Products";
import ProductForm from "./pages/admin/ProductForm";
import AlibabaImport from "./pages/admin/AlibabaImport";
import QuoteManagement from "./pages/admin/QuoteManagement";
import { WMSCustomerLayout } from "./layouts/WMSCustomerLayout";
import { AppLayout } from "./layouts/AppLayout";
import CustomerDashboard from "./pages/warehouse/CustomerDashboard";
import WMSInventory from "./pages/warehouse/Inventory";
import WMSOrders from "./pages/warehouse/Orders";
import WMSInvoices from "./pages/warehouse/Invoices";
import WMSContract from "./pages/warehouse/Contract";
import WMSBranches from "./pages/warehouse/Branches";
import WMSProductRequests from "./pages/warehouse/ProductRequests";
import WMSSettings from "./pages/warehouse/Settings";
import WMSReports from "./pages/warehouse/Reports";
import AdminWMSCustomers from "./pages/admin/WMSCustomers";
import AdminWMSUsers from "./pages/admin/WMSUsers";
import AdminWMSContracts from "./pages/admin/WMSContracts";
import AdminWMSInventory from "./pages/admin/WMSInventory";
import AdminWMSOrders from "./pages/admin/WMSOrders";
import AdminWMSInvoices from "./pages/admin/WMSInvoices";
import AdminWMSDrivers from "./pages/admin/WMSDrivers";
import AdminWMSWorkflow from "./pages/admin/WMSWorkflow";
import WMSWorkflow from "./pages/admin/WMSWorkflow";
import WMSMISReport from "./pages/admin/WMSMISReport";
import AdminWMSDashboard from "./pages/admin/WMSDashboard";
import WMSAuth from "./pages/warehouse/Auth";
import WMSCustomerOrders from "./components/admin/WMSCustomerOrders";
import ProductRequestApproval from "./components/admin/ProductRequestApproval";
import Analytics from "./pages/admin/Analytics";
import WMSSupport from "./pages/admin/WMSSupport";
import { LiveChatWidget } from "./components/chat/LiveChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/warehouse/auth" element={<WMSAuth />} />
          
          {/* Authenticated Routes with Sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tracking/:trackingNumber" element={<Tracking />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/rates" element={<Rates />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/locations" element={<Locations />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/products/new" element={<ProductForm />} />
            <Route path="/admin/products/:id/edit" element={<ProductForm />} />
            <Route path="/admin/products/import/alibaba" element={<AlibabaImport />} />
            <Route path="/admin/quotes" element={<QuoteManagement />} />
            <Route path="/admin/product-approvals" element={<ProductRequestApproval />} />
            
            {/* Admin WMS Routes */}
            <Route path="/admin/wms" element={<AdminWMSDashboard />} />
            <Route path="/admin/wms-customers" element={<AdminWMSCustomers />} />
            <Route path="/admin/wms-users" element={<AdminWMSUsers />} />
            <Route path="/admin/wms-customer-orders" element={<WMSCustomerOrders />} />
            <Route path="/admin/wms-contracts" element={<AdminWMSContracts />} />
            <Route path="/admin/wms-inventory" element={<AdminWMSInventory />} />
            <Route path="/admin/wms-orders" element={<AdminWMSOrders />} />
            <Route path="/admin/wms-invoices" element={<AdminWMSInvoices />} />
            <Route path="/admin/wms-drivers" element={<AdminWMSDrivers />} />
            <Route path="/admin/wms-workflow" element={<WMSWorkflow />} />
            <Route path="/admin/wms-mis-report" element={<WMSMISReport />} />
            <Route path="/admin/wms-support" element={<WMSSupport />} />
            
            {/* Other Dashboards */}
            <Route path="/employee" element={<EmployeeDashboard />} />
            <Route path="/partner" element={<PartnerDashboard />} />
            <Route path="/partner/locations" element={<Locations />} />
            <Route path="/finance" element={<FinanceDashboard />} />
            
            {/* WMS Customer Routes */}
            <Route path="/warehouse/dashboard" element={<CustomerDashboard />} />
            <Route path="/warehouse/inventory" element={<WMSInventory />} />
            <Route path="/warehouse/orders" element={<WMSOrders />} />
            <Route path="/warehouse/invoices" element={<WMSInvoices />} />
            <Route path="/warehouse/reports" element={<WMSReports />} />
            <Route path="/warehouse/contract" element={<WMSContract />} />
            <Route path="/warehouse/branches" element={<WMSBranches />} />
            <Route path="/warehouse/product-requests" element={<WMSProductRequests />} />
            <Route path="/warehouse/settings" element={<WMSSettings />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <LiveChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
