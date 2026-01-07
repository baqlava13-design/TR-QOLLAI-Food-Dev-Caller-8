import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { CartProvider } from "@/lib/cart";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import Giris from "@/pages/giris";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function ProtectedAdmin() {
  const [, setLocation] = useLocation();
  const { data: session, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/session"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.authenticated) {
    return <Redirect to="/giris" />;
  }

  return <Admin />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/giris" component={Giris} />
      <Route path="/admin" component={ProtectedAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
