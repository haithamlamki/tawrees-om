import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { ShippingCalculatorNew } from "@/components/ShippingCalculatorNew";
import { Ship, Globe, Clock, Shield } from "lucide-react";
import ProductVideoCard from "@/components/products/ProductVideoCard";
import QuoteRequestDrawer from "@/components/products/QuoteRequestDrawer";
import { Product } from "@/types/products";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showQuoteDrawer, setShowQuoteDrawer] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchProducts();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      
      const mappedData = (data || []).map(p => ({
        ...p,
        gallery_images: Array.isArray(p.gallery_images) ? p.gallery_images as string[] : [],
        tags: Array.isArray(p.tags) ? p.tags as string[] : [],
        highlight_bullets: Array.isArray(p.highlight_bullets) ? p.highlight_bullets as string[] : [],
        pricing_tiers: Array.isArray(p.pricing_tiers) ? p.pricing_tiers as any[] : [],
        delivery_options: Array.isArray(p.delivery_options) ? p.delivery_options as string[] : ['pickup', 'door'],
        specs: typeof p.specs === 'object' && p.specs !== null ? p.specs as Record<string, string> : {},
        dims_cm: p.dims_cm as any,
      })) as unknown as Product[];
      
      setProducts(mappedData);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleRequestQuote = (product: Product) => {
    setSelectedProduct(product);
    setShowQuoteDrawer(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} />
      
      {/* Hero Section */}
      <section className="gradient-hero text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Global Shipping Made Simple
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto">
            Calculate costs, track shipments, and manage your international shipping from China with ease
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ship className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Sea & Air Shipping</h3>
              <p className="text-sm text-muted-foreground">
                Flexible options for both container and air freight
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Real-time Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Monitor your shipment every step of the way
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Fast Processing</h3>
              <p className="text-sm text-muted-foreground">
                Quick quote approval and shipment initiation
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-sm text-muted-foreground">
                Professional handling with comprehensive insurance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      {products.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Featured Products
              </h2>
              <p className="text-lg text-muted-foreground">
                Browse our curated selection of quality products from trusted suppliers
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {products.map((product) => (
                <ProductVideoCard
                  key={product.id}
                  product={product}
                  onRequestQuote={handleRequestQuote}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Calculator Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Calculate Your Shipping Cost
            </h2>
            <p className="text-lg text-muted-foreground">
              Get an instant quote for your shipment
            </p>
          </div>
          <ShippingCalculatorNew />
        </div>
      </section>

      <QuoteRequestDrawer
        product={selectedProduct}
        open={showQuoteDrawer}
        onClose={() => setShowQuoteDrawer(false)}
      />

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Tawreed. Your trusted shipping partner.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
