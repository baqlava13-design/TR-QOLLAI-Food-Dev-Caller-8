import type { CartItem } from "@shared/schema";

const DEFAULT_PHONE = import.meta.env.VITE_WHATSAPP_PHONE || "905551234567";

function isDesktop(): boolean {
  return !/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  
  if (isDesktop()) {
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
  } else {
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }
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
  const phoneNumber = businessPhone || DEFAULT_PHONE;
  
  const orderLines = items.map((item) => {
    const upsellNames = item.selectedUpsells.map((u) => u.name).join(", ");
    const upsellText = upsellNames ? ` (${upsellNames})` : "";
    return `${item.quantity}x ${item.menuItem.name}${upsellText} ${(parseFloat(item.menuItem.price) * item.quantity).toFixed(2)} TL`;
  });

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = parseFloat(item.menuItem.price);
    const upsellsPrice = item.selectedUpsells.reduce((u, upsell) => u + parseFloat(upsell.price), 0);
    return sum + (itemPrice + upsellsPrice) * item.quantity;
  }, 0);

  const paymentText = paymentMethod === "cash" ? "Nakit" : "POS";

  const messageParts = [
    "YENI SIPARIS",
    "",
    ...orderLines,
    "",
    `Toplam: ${subtotal.toFixed(2)} TL`,
    "",
    `Ad: ${customerName}`,
    `Tel: ${customerPhone}`,
    `Adres: ${customerAddress}`,
    `Odeme: ${paymentText}`,
  ];
  
  if (notes && notes.trim()) {
    messageParts.push(`Not: ${notes}`);
  }
  
  messageParts.push("");
  messageParts.push(`Tarih: ${new Date().toLocaleString("tr-TR")}`);
  
  const message = messageParts.join("\n");
  
  return buildWhatsAppUrl(phoneNumber, message);
}

export function openWhatsAppLink(url: string): void {
  window.location.href = url;
}

export function generateCustomerConfirmationLink(
  items: CartItem[],
  customerName: string,
  customerPhone: string,
  paymentMethod: "cash" | "pos"
): string {
  const orderLines = items.map((item) => {
    return `${item.quantity}x ${item.menuItem.name}`;
  });

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = parseFloat(item.menuItem.price);
    const upsellsPrice = item.selectedUpsells.reduce((u, upsell) => u + parseFloat(upsell.price), 0);
    return sum + (itemPrice + upsellsPrice) * item.quantity;
  }, 0);

  const paymentText = paymentMethod === "cash" ? "Nakit" : "POS";

  let formattedPhone = customerPhone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "90" + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith("90")) {
    formattedPhone = "90" + formattedPhone;
  }

  const message = `Merhaba ${customerName}!

Siparisini aldik:
${orderLines.join("\n")}

Toplam: ${subtotal.toFixed(2)} TL
Odeme: ${paymentText}

Teslimat 30-45 dakika.

Siparis Kolay`;

  return buildWhatsAppUrl(formattedPhone, message);
}

export function generateShareLink(text: string): string {
  const shareMessage = `${text}

Siparis Kolay - WhatsApp ile hizli teslimat.`;

  const encodedMessage = encodeURIComponent(shareMessage);
  
  if (isDesktop()) {
    return `https://web.whatsapp.com/send?text=${encodedMessage}`;
  } else {
    return `https://wa.me/?text=${encodedMessage}`;
  }
}
