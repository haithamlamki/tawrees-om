import { Button } from "@/components/ui/button";
import { Menu, Bell, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import logo from "@/assets/tawreed-logo.png";

export const MobileHeader = () => {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <div className="flex flex-col gap-4 mt-8">
              <Link to="/dashboard" className="text-lg font-medium">
                Dashboard
              </Link>
              <Link to="/warehouse/inventory" className="text-lg font-medium">
                Inventory
              </Link>
              <Link to="/warehouse/orders" className="text-lg font-medium">
                Orders
              </Link>
              <Link to="/warehouse/invoices" className="text-lg font-medium">
                Invoices
              </Link>
              <Link to="/warehouse/reports" className="text-lg font-medium">
                Reports
              </Link>
              <Link to="/warehouse/settings" className="text-lg font-medium">
                Settings
              </Link>
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Tawreed" className="h-8" />
          <span className="font-bold text-primary">Tawreed</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
