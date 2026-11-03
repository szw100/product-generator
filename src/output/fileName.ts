import { sep } from "node:path";

const UNSAFE_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]/;

export function formatResearchDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildDatedFileName(
  sku: string,
  researchDate: string,
  extension: "json" | "docx",
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(researchDate)) {
    throw new Error("Research date must use YYYY-MM-DD");
  }

  return `${sanitizeSku(sku)}-${researchDate}.${extension}`;
}

export function assertInsideDirectory(directory: string, filePath: string): void {
  const root = directory.endsWith(sep) ? directory : `${directory}${sep}`;
  if (!filePath.startsWith(root)) {
    throw new Error(`Refusing to write outside ${directory}`);
  }
}

function sanitizeSku(sku: string): string {
  if (!UNSAFE_FILENAME_CHARACTERS.test(sku) && !sku.includes("..")) {
    return sku;
  }

  const sanitized = sku
    .replace(new RegExp(UNSAFE_FILENAME_CHARACTERS, "g"), "-")
    .replace(/\.\./g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (sanitized.length === 0) {
    throw new Error("SKU cannot be used as a filename");
  }

  return sanitized;
}
