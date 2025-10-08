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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
