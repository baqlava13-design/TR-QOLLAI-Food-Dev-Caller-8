import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ShoppingCart, Sun, Moon, Phone } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useCart } from "@/lib/cart";
import { useTheme } from "@/lib/theme";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { label: "Menü", href: "#menu" },
  { label: "Yorumlar", href: "#reviews" },
  { label: "İletişim", href: "#contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { getItemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const itemCount = getItemCount();
  
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileOpen(false);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-background shadow-sm py-3"
      data-testid="header"
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
        <a
          href="#"
          className="flex items-center gap-2 min-w-0"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          data-testid="link-logo"
        >
          {settings.company_logo ? (
            <img 
              src={settings.company_logo} 
              alt={settings.footer_logo_name || "Kolay Sipariş"} 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-base sm:text-lg">
                {(settings.footer_logo_name || "Kolay Sipariş").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="font-bold text-lg sm:text-xl text-foreground truncate">
            {settings.footer_logo_name || "Kolay Sipariş"}
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => scrollToSection(item.href)}
              className="font-medium transition-colors hover-elevate active-elevate-2 px-3 py-2 rounded-md text-foreground"
              data-testid={`link-nav-${item.label.toLowerCase()}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <Button
            size="icon"
            variant={itemCount > 0 ? "default" : "ghost"}
            onClick={() => scrollToSection("#order")}
            className="relative"
            data-testid="button-cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center px-1 text-[11px] font-bold rounded-full bg-red-500 text-white border-2 border-background">
                {itemCount}
              </span>
            )}
          </Button>

          <Button
            onClick={() => scrollToSection("#order")}
            className="hidden sm:flex items-center gap-2 bg-whatsapp text-white border-whatsapp"
            data-testid="button-order-now"
          >
            <SiWhatsapp className="h-4 w-4" />
            Sipariş Ver
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => scrollToSection(item.href)}
                    className="text-lg font-medium text-left py-2 hover-elevate active-elevate-2 rounded-md px-3"
                    data-testid={`link-mobile-nav-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </button>
                ))}
                <Button
                  onClick={() => scrollToSection("#order")}
                  className="mt-4 bg-whatsapp text-white flex items-center gap-2"
                  data-testid="button-mobile-order"
                >
                  <SiWhatsapp className="h-4 w-4" />
                  WhatsApp ile Sipariş Ver
                </Button>
                <div className="flex items-center gap-2 text-muted-foreground mt-4">
                  <Phone className="h-4 w-4" />
                  <span>0555 123 4567</span>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
