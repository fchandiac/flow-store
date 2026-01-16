export const PROTECTED_TAX_CODES = new Set<string>(['IVA', 'EXENTO', 'IVA-19']);

export function isProtectedTaxCode(code?: string | null): boolean {
  if (!code) {
    return false;
  }

  return PROTECTED_TAX_CODES.has(code.trim().toUpperCase());
}
