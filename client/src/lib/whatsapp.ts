import type { CartItem } from "@shared/schema";

const DEFAULT_PHONE = import.meta.env.VITE_WHATSAPP_PHONE || "905551234567";

// Detect if user is on a mobile device
function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry/i.test(navigator.userAgent);
}

// Generate WhatsApp URL based on device type
function getWhatsAppUrl(phone: string, encodedMessage: string): string {
  if (isMobileDevice()) {
    // Mobile devices (iPhone, Android) - use whatsapp:// protocol
    return `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
  } else {
    // Desktop browsers - use web.whatsapp.com
    return `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
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
    const upsellText = upsellNames ? ` (+ ${upsellNames})` : "";
    return `${item.quantity}x ${item.menuItem.name}${upsellText} - ${(parseFloat(item.menuItem.price) * item.quantity).toFixed(2)} TL`;
  });

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = parseFloat(item.menuItem.price);
    const upsellsPrice = item.selectedUpsells.reduce((u, upsell) => u + parseFloat(upsell.price), 0);
    return sum + (itemPrice + upsellsPrice) * item.quantity;
  }, 0);

  const paymentText = paymentMethod === "cash" ? "Nakit" : "POS ile Kart";

  // Build message with simple format - avoid special characters that may cause issues
  const lines: string[] = [
    "YENI SIPARIS",
    "",
    ...orderLines,
    "",
    `Toplam: ${subtotal.toFixed(2)} TL`,
    "",
    "Musteri Bilgileri:",
    `Ad: ${customerName}`,
    `Telefon: ${customerPhone}`,
    `Adres: ${customerAddress}`,
    `Odeme: ${paymentText}`,
  ];
  
  if (notes && notes.trim()) {
    lines.push(`Not: ${notes}`);
  }
  
  lines.push("");
  lines.push(`Siparis zamani: ${new Date().toLocaleString("tr-TR")}`);
  
  const message = lines.join("\n");

  const encodedMessage = encodeURIComponent(message);
  // Clean phone number - remove any non-digit characters and leading +
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  // Use device-specific URL format
  return getWhatsAppUrl(cleanPhone, encodedMessage);
}

export function openWhatsAppLink(url: string): void {
  // Try multiple methods to open WhatsApp link
  // This handles various browser contexts (iframe, popup blockers, mobile, desktop)
  
  // Method 1: Create an anchor element and click it (works in most cases)
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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

  const paymentText = paymentMethod === "cash" ? "Nakit" : "POS ile Kart";

  // Format phone number - ensure it has country code
  let formattedPhone = customerPhone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "90" + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith("90")) {
    formattedPhone = "90" + formattedPhone;
  }

  const message = `
Merhaba ${customerName}!

Siparisini aldik:
${orderLines.join("\n")}

Toplam: ${subtotal.toFixed(2)} TL
Odeme: ${paymentText}

Siparisini hazirlamaya basladik! Teslimat suremiz 30-45 dakikadir.

Siparis Kolay
`.trim();

  const encodedMessage = encodeURIComponent(message);
  // Use device-specific URL format
  return getWhatsAppUrl(formattedPhone, encodedMessage);
}

export function generateShareLink(text: string): string {
  const shareMessage = `
${text}

Siparis Kolay'dan siparis vermek cok kolay! WhatsApp ile hizli teslimat.
`.trim();
  const encodedMessage = encodeURIComponent(shareMessage);
  // For sharing without specific phone number
  if (isMobileDevice()) {
    return `whatsapp://send?text=${encodedMessage}`;
  } else {
    return `https://web.whatsapp.com/send?text=${encodedMessage}`;
  }
}
