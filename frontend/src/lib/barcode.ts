/** GS1's own GTIN-14 normalization: numeric-only, left-padded with zeros to 14 digits.
 * Needed because a physical barcode's width varies by symbology (a UPC-A scan returns
 * 12 digits, EAN-13 13, GTIN-14 14, ...) for what's otherwise the same code - USDA's own
 * gtin_upc data isn't width-consistent either, so both storage (see the backend's
 * import_usda_bulk_csv.py) and lookup (nutrition.services.normalize_barcode) normalize
 * through this same rule. Returns null for anything that isn't a plausible barcode
 * (non-numeric, or too long to be a real GTIN). */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits || digits.length > 14) return null
  return digits.padStart(14, '0')
}
