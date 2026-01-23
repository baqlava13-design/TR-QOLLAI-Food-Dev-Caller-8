import type { CartItem } from "@shared/schema";

const DEFAULT_PHONE = import.meta.env.VITE_WHATSAPP_PHONE || "905551234567";

function turkishToAscii(text: string): string {
  const map: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
  };
  return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, char => map[char] || char);
}

export function generateWhatsAppOrderLink(
  items: CartItem[],
  customerName: string,
  customerPhone: string,
  customerAddress: string,
  paymentMethod: "cash" | "pos",
  notes?: string,
  businessPhone?: string
): string {
  const phoneNumber = (businessPhone || DEFAULT_PHONE).replace(/\D/g, "");
  
  const orderItems = items.map((item) => {
    const name = turkishToAscii(item.menuItem.name).trim();
    return `${item.quantity}x ${name}`;
  }).join(", ");

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = parseFloat(item.menuItem.price);
    const upsellsPrice = item.selectedUpsells.reduce((u, upsell) => u + parseFloat(upsell.price), 0);
    return sum + (itemPrice + upsellsPrice) * item.quantity;
  }, 0);

  const paymentText = paymentMethod === "cash" ? "Nakit" : "POS";
  const cleanName = turkishToAscii(customerName);
  const cleanAddress = turkishToAscii(customerAddress);

  // Single line message - no newlines for iOS compatibility
  let message = `SIPARIS: ${orderItems} | Toplam: ${subtotal.toFixed(2)}TL | Ad: ${cleanName} | Tel: ${customerPhone} | Adres: ${cleanAddress} | Odeme: ${paymentText}`;
  
  if (notes && notes.trim()) {
    message += ` | Not: ${turkishToAscii(notes)}`;
  }

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encoded}`;
}

export function generateCustomerConfirmationLink(
  items: CartItem[],
  customerName: string,
  customerPhone: string,
  paymentMethod: "cash" | "pos"
): string {
  const orderItems = items.map((item) => {
    return `${item.quantity}x ${turkishToAscii(item.menuItem.name).trim()}`;
  }).join(", ");

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = parseFloat(item.menuItem.price);
    const upsellsPrice = item.selectedUpsells.reduce((u, upsell) => u + parseFloat(upsell.price), 0);
    return sum + (itemPrice + upsellsPrice) * item.quantity;
  }, 0);

  let formattedPhone = customerPhone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "90" + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith("90")) {
    formattedPhone = "90" + formattedPhone;
  }

  const cleanName = turkishToAscii(customerName);
  const message = `Merhaba ${cleanName}! Siparis: ${orderItems} | Toplam: ${subtotal.toFixed(2)}TL | Teslimat 30-45dk`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encoded}`;
}

export function generateShareLink(text: string): string {
  const cleanText = turkishToAscii(text);
  const encoded = encodeURIComponent(cleanText);
  return `https://wa.me/?text=${encoded}`;
}
