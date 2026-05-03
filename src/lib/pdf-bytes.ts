/**
 * Many tools emit a BOM or small preamble before `%PDF-`. pdf.js needs the stream
 * starting at the header.
 */
export function findPdfHeaderOffset(buf: Buffer): number {
  const limit = Math.min(buf.length, 65_536);
  for (let i = 0; i <= limit - 5; i++) {
    if (
      buf[i] === 0x25 &&
      buf[i + 1] === 0x50 &&
      buf[i + 2] === 0x44 &&
      buf[i + 3] === 0x46 &&
      buf[i + 4] === 0x2d
    ) {
      return i;
    }
  }
  return -1;
}

/** Uint8Array view from the first `%PDF-` in the file (copy, safe for pdf.js). */
export function toPdfUint8Array(buf: Buffer): Uint8Array | null {
  const off = findPdfHeaderOffset(buf);
  if (off < 0) return null;
  return new Uint8Array(buf.subarray(off));
}

export function hasPdfMagic(buf: Buffer): boolean {
  return findPdfHeaderOffset(buf) >= 0;
}
