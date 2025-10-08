import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import AdminWMSContracts from "./pages/admin/WMSContracts";
import AdminWMSInventory from "./pages/admin/WMSInventory";
import AdminWMSOrders from "./pages/admin/WMSOrders";
import AdminWMSInvoices from "./pages/admin/WMSInvoices";
import AdminWMSDrivers from "./pages/admin/WMSDrivers";
import AdminWMSWorkflow from "./pages/admin/WMSWorkflow";
import AdminWMSDashboard from "./pages/admin/WMSDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/finance" element={<FinanceDashboard />} />
          <Route path="/tracking/:trackingNumber" element={<Tracking />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/admin/locations" element={<Locations />} />
          <Route path="/partner/locations" element={<Locations />} />
          <Route path="/rates" element={<Rates />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/new" element={<ProductForm />} />
          <Route path="/admin/products/:id/edit" element={<ProductForm />} />
          <Route path="/admin/products/import/alibaba" element={<AlibabaImport />} />
          <Route path="/admin/quotes" element={<QuoteManagement />} />
          
          {/* WMS Routes */}
          <Route path="/warehouse" element={<WMSCustomerLayout />}>
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="inventory" element={<WMSInventory />} />
            <Route path="orders" element={<WMSOrders />} />
            <Route path="invoices" element={<WMSInvoices />} />
            <Route path="reports" element={<WMSReports />} />
            <Route path="contract" element={<WMSContract />} />
            <Route path="branches" element={<WMSBranches />} />
            <Route path="product-requests" element={<WMSProductRequests />} />
            <Route path="settings" element={<WMSSettings />} />
          </Route>
          <Route path="/admin/wms" element={<AdminWMSDashboard />} />
          <Route path="/admin/wms-customers" element={<AdminWMSCustomers />} />
          <Route path="/admin/wms-contracts" element={<AdminWMSContracts />} />
          <Route path="/admin/wms-inventory" element={<AdminWMSInventory />} />
          <Route path="/admin/wms-orders" element={<AdminWMSOrders />} />
          <Route path="/admin/wms-invoices" element={<AdminWMSInvoices />} />
          <Route path="/admin/wms-drivers" element={<AdminWMSDrivers />} />
          <Route path="/admin/wms-workflow" element={<AdminWMSWorkflow />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
