import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { CartProvider } from "@/lib/cart";
import { useBrandColors } from "@/hooks/use-brand-colors";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import SiparisGirisi from "@/pages/siparis-girisi";
import SuperAdmin from "@/pages/superadmin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/siparis" component={SiparisGirisi} />
      <Route path="/admin" component={Admin} />
      <Route path="/superadmin" component={SuperAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function BrandColorApplicator({ children }: { children: React.ReactNode }) {
  useBrandColors();
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrandColorApplicator>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </CartProvider>
        </BrandColorApplicator>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
