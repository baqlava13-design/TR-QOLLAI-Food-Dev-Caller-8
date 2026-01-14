import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ShoppingCart, Sun, Moon, Phone } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useCart } from "@/lib/cart";
import { useTheme } from "@/lib/theme";

const navItems = [
  { label: "Menu", href: "#menu" },
  { label: "Yorumlar", href: "#reviews" },
  { label: "Iletisim", href: "#contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { getItemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const itemCount = getItemCount();

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
          className="flex items-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          data-testid="link-logo"
        >
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">LE</span>
          </div>
          <span className="font-bold text-xl text-foreground">
            Lezzet Express
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
            variant="ghost"
            onClick={() => scrollToSection("#order")}
            className="relative"
            data-testid="button-cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground"
              >
                {itemCount}
              </Badge>
            )}
          </Button>

          <Button
            onClick={() => scrollToSection("#order")}
            className="hidden sm:flex items-center gap-2 bg-whatsapp text-white border-whatsapp"
            data-testid="button-order-now"
          >
            <SiWhatsapp className="h-4 w-4" />
            Siparis Ver
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
                  WhatsApp ile Siparis Ver
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
