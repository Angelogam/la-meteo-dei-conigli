/**
 * Generatore PDF per la locandina: incorpora il raster JPEG della poster
 * (filtro DCTDecode) in un PDF monopagina di formato «locandina».
 * Nessuna dipendenza esterna: gli offset vengono calcolati sui byte reali.
 */

const enc = new TextEncoder();

export async function jpegToPdfBlob(jpeg: Blob, pageWidthPt = 595.28): Promise<Blob> {
  const bmp = await createImageBitmap(jpeg);
  const pxW = bmp.width;
  const pxH = bmp.height;
  bmp.close?.();

  const jpegBytes = new Uint8Array(await jpeg.arrayBuffer());
  const scale = pageWidthPt / pxW;
  const pageH = Math.round(pxH * scale * 100) / 100;
  const pageW = Math.round(pageWidthPt * 100) / 100;

  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const pushStr = (s: string) => {
    const b = enc.encode(s);
    parts.push(b);
    len += b.byteLength;
  };
  const pushBin = (b: Uint8Array) => {
    parts.push(b);
    len += b.byteLength;
  };

  pushStr("%PDF-1.5\n%\xE2\xE3\xCF\xD3\n");

  // 1: catalogo
  offsets.push(len);
  pushStr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // 2: pagine
  offsets.push(len);
  pushStr("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // 3: pagina
  offsets.push(len);
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  // 4: immagine JPEG (DCTDecode)
  offsets.push(len);
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`,
  );
  pushBin(jpegBytes);
  pushStr("\nendstream\nendobj\n");

  // 5: contenuto
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q\n`;
  offsets.push(len);
  pushStr(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  // xref
  const xrefStart = len;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pushStr(xref);

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
