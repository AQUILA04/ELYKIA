import { inflateRawSync, inflateSync } from 'zlib';

export function assertPdfMagic(body: Buffer, label: string): void {
  const header = body.subarray(0, 5).toString('latin1');
  if (!header.startsWith('%PDF')) {
    throw new Error(`${label}: expected %PDF, got ${JSON.stringify(header)} (${body.length} bytes)`);
  }
}

function decodePdfLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodeHexString(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length < 4 || clean.length % 2 !== 0) {
    return '';
  }
  const bytes = Buffer.from(clean, 'hex');
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return bytes.swap16().slice(2).toString('utf16le');
  }
  return bytes.toString('latin1');
}

function literalsFrom(content: string): string[] {
  const out: string[] = [];
  const paren = /\((?:\\.|[^\\)])*\)/g;
  let match: RegExpExecArray | null;
  while ((match = paren.exec(content))) {
    out.push(decodePdfLiteral(match[0].slice(1, -1)));
  }
  const hex = /<([0-9A-Fa-f\s]+)>/g;
  while ((match = hex.exec(content))) {
    const decoded = decodeHexString(match[1]);
    if (decoded.trim()) {
      out.push(decoded);
    }
  }
  return out;
}

function inflateStream(raw: Buffer): string | null {
  for (const inflate of [inflateSync, inflateRawSync]) {
    try {
      return inflate(raw).toString('latin1');
    } catch {
      /* try next strategy */
    }
  }
  return null;
}

/** Best-effort text from iText html2pdf streams (no extra dependency). */
export function extractPdfText(body: Buffer): string {
  const latin = body.toString('latin1');
  const chunks: string[] = [latin];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(latin))) {
    const inflated = inflateStream(Buffer.from(match[1], 'latin1'));
    if (inflated) {
      chunks.push(inflated);
    }
  }
  const joined = chunks.join('\n');
  return [...new Set(literalsFrom(joined))].join(' ');
}
