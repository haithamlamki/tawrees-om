import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/products";
import { Play, ShoppingCart } from "lucide-react";

interface ProductVideoCardProps {
  product: Product;
  onRequestQuote: (product: Product) => void;
}

export default function ProductVideoCard({ product, onRequestQuote }: ProductVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handlePlay = () => {
    setIsPlaying(true);
    if (window.gtag) {
      window.gtag('event', 'video_play', {
        product_id: product.id,
        product_name: product.name,
      });
    }
  };

  const handleRequestQuote = () => {
    onRequestQuote(product);
    if (window.gtag) {
      window.gtag('event', 'quote_open', {
        product_id: product.id,
        product_name: product.name,
      });
    }
  };

  return (
    <Card ref={cardRef} className="overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="aspect-video relative bg-muted">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube.com/embed/${product.youtube_id}?autoplay=1`}
            title={product.name}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <img
              src={product.hero_thumbnail}
              alt={product.name}
              className="object-cover w-full h-full"
              loading={isVisible ? "eager" : "lazy"}
            />
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
              </div>
            </button>
          </>
        )}
        {product.tags.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1">
            {product.tags.slice(0, 2).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.short_name}</h3>
        
        {product.highlight_bullets.length > 0 && (
          <ul className="space-y-1 mb-4 text-sm text-muted-foreground">
            {product.highlight_bullets.slice(0, 3).map((bullet, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2">•</span>
                <span className="line-clamp-1">{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 text-sm border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">From:</span>
            <span className="font-bold text-lg text-primary">
              {product.base_unit_price} {product.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Min Order:</span>
            <span className="font-medium">{product.min_order_qty} units</span>
          </div>
          {product.lead_time_days && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lead Time:</span>
              <span className="font-medium">{product.lead_time_days} days</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button onClick={handleRequestQuote} className="flex-1">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Request Quote
        </Button>
        {!isPlaying && (
          <Button variant="outline" onClick={handlePlay}>
            <Play className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
