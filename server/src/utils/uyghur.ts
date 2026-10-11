/**
 * Uyghur language normalization & helper utilities
 * Normalizes different input conventions (e.g. Arabic Persian keyboards vs Uyghur keyboards)
 */
export function normalizeUyghurText(text: string): string {
  if (!text) return '';

  return text
    // Replace Persian/Arabic kaf with Uyghur kaf
    .replace(/ك/g, 'ك')
    .replace(/ک/g, 'ك')
    // Replace Arabic yeh / farsi yeh / alif maqsura with Uyghur yeh
    .replace(/ي/g, 'ي')
    .replace(/ی/g, 'ي')
    .replace(/ى/g, 'ى')
    // Replace hamza alif
    .replace(/أ/g, 'ئا')
    .replace(/إ/g, 'ئى')
    .replace(/آ/g, 'ئا')
    // Replace Arabic ha with Uyghur he
    .replace(/ه/g, 'ە')
    .replace(/ة/g, 'ە')
    // Trim multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a text is primarily Right-to-Left (Uyghur, Arabic, etc.)
 */
export function isRTL(text: string): boolean {
  if (!text) return true; // Default RTL for Alaqe app
  const rtlChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return rtlChars.test(text);
}
