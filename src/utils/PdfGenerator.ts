/**
 * Generatore PDF per la locandina: incorpora le pagine rasterizzate JPEG
 * (filtro DCTDecode) in un PDF in formato A4 (210 × 297 mm).
 * Nessuna dipendenza esterna: gli offset vengono calcolati sui byte reali.
 */

const enc = new TextEncoder();
const A4_W_PT = 595.28; // 210 mm

export async function jpegsToPdfBlob(jpegs: Blob[], pageWidthPt: number = A4_W_PT): Promise<Blob> {
  if (!jpegs.length) throw new Error("nessuna pagina fornita");

  const pages: Array<{ w: number; h: number; bytes: Uint8Array }> = [];
  for (const jpeg of jpegs) {
    const bmp = await createImageBitmap(jpeg);
    const pxW = bmp.width;
    const pxH = bmp.height;
    bmp.close?.();
    const bytes = new Uint8Array(await jpeg.arrayBuffer());
    pages.push({ w: pxW, h: pxH, bytes });
  }

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const pageW = round2(pageWidthPt);
  const pageSizes = pages.map((p) => ({ w: pageW, h: round2((p.h * pageWidthPt) / p.w) }));

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

  // 1: catalogo, 2: pagine
  offsets.push(len);
  pushStr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  offsets.push(len);
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  // per ogni pagina: Page, Image, Contents (3 oggetti)
  pages.forEach((p, i) => {
    const pageId = 3 + i * 3;
    const imgId = pageId + 1;
    const contentId = pageId + 2;
    const { w, h } = pageSizes[i];
    offsets.push(len);
    pushStr(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] ` +
        `/Resources << /XObject << /Im${i} ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    offsets.push(len);
    pushStr(
      `${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.byteLength} >>\nstream\n`,
    );
    pushBin(p.bytes);
    pushStr("\nendstream\nendobj\n");
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q\n`;
    offsets.push(len);
    pushStr(`${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
  });

  // xref
  const xrefStart = len;
  const count = 2 + pages.length * 3;
  let xref = `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pushStr(xref);

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
