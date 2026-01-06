import { createContext, useContext, useState, useCallback } from "react";
import type { MenuItem, UpsellOption, CartItem } from "@shared/schema";

interface CartContextType {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity?: number, upsells?: UpsellOption[]) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((menuItem: MenuItem, quantity = 1, upsells: UpsellOption[] = []) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + quantity, selectedUpsells: [...item.selectedUpsells, ...upsells] }
            : item
        );
      }
      return [...prev, { menuItem, quantity, selectedUpsells: upsells }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((item) => item.menuItem.id !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const getSubtotal = useCallback(() => {
    return items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.menuItem.price);
      const upsellsPrice = item.selectedUpsells.reduce((u, upsell) => u + parseFloat(upsell.price), 0);
      return sum + (itemPrice + upsellsPrice) * item.quantity;
    }, 0);
  }, [items]);

  const getTotal = useCallback(() => {
    return getSubtotal();
  }, [getSubtotal]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemCount,
        getSubtotal,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
