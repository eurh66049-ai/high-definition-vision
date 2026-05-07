// Utilities for handling WhatsApp numbers/links safely.
// We store the user's WhatsApp value in DB as a phone number (digits, optional leading +).
// When opening WhatsApp, we convert it to a valid wa.me URL (without +).

export const normalizeWhatsAppNumberInput = (input: string): string | null => {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  let candidate = raw;

  // If user pasted a full WhatsApp URL, try extracting the phone part
  const waMeMatch = candidate.match(/wa\.me\/(\+?\d+)/i);
  if (waMeMatch?.[1]) {
    candidate = waMeMatch[1];
  }

  const phoneParamMatch = candidate.match(/[?&]phone=(\+?\d+)/i);
  if (phoneParamMatch?.[1]) {
    candidate = phoneParamMatch[1];
  }

  // Keep digits and +, but allow + only at the very beginning.
  let cleaned = candidate.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
  } else {
    cleaned = cleaned.replace(/\+/g, '');
  }

  if (!cleaned || cleaned === '+') return null;
  return cleaned;
};

export const extractWhatsAppNumberFromStored = (stored: string | null | undefined): string => {
  if (!stored) return '';
  return normalizeWhatsAppNumberInput(stored) ?? '';
};

export const buildWhatsAppUrl = (storedOrInput: string | null | undefined): string | null => {
  if (!storedOrInput) return null;
  const normalized = normalizeWhatsAppNumberInput(storedOrInput);
  if (!normalized) return null;

  const digitsOnly = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  if (!digitsOnly) return null;

  return `https://wa.me/${digitsOnly}`;
};
