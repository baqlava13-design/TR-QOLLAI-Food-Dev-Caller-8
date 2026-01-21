export interface SavedCustomerInfo {
  name: string;
  phone: string;
  neighborhood: string;
  street: string;
  buildingNo: string;
  apartmentNo: string;
  notes: string;
}

export interface SavedOrder {
  id: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  total: string;
}

const CUSTOMER_INFO_KEY = "kolay_siparis_customer";
const ORDER_HISTORY_KEY = "kolay_siparis_orders";

export function saveCustomerInfo(info: SavedCustomerInfo): void {
  try {
    localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(info));
  } catch (e) {
    console.error("Failed to save customer info:", e);
  }
}

export function loadCustomerInfo(): SavedCustomerInfo | null {
  try {
    const saved = localStorage.getItem(CUSTOMER_INFO_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load customer info:", e);
  }
  return null;
}

export function saveOrder(order: Omit<SavedOrder, "id" | "date">): void {
  try {
    const history = loadOrderHistory();
    const newOrder: SavedOrder = {
      ...order,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    history.unshift(newOrder);
    if (history.length > 10) {
      history.pop();
    }
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save order:", e);
  }
}

export function loadOrderHistory(): SavedOrder[] {
  try {
    const saved = localStorage.getItem(ORDER_HISTORY_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load order history:", e);
  }
  return [];
}

export function clearCustomerData(): void {
  try {
    localStorage.removeItem(CUSTOMER_INFO_KEY);
    localStorage.removeItem(ORDER_HISTORY_KEY);
  } catch (e) {
    console.error("Failed to clear customer data:", e);
  }
}
