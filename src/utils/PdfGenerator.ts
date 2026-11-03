function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

export function generatePDFBlob(report: string, title = "Report AI Meteo"): Blob {
  const lines = wrapPdfText(report, 92);
  const blocks: string[] = [
    "BT",
    "/F1 20 Tf",
    "50 780 Td",
    `(${escapePdfText(title)}) Tj`,
    "0 -28 Td",
    "/F1 11 Tf",
  ];

  lines.slice(0, 16).forEach((line, index) => {
    blocks.push(`50 ${740 - index * 22} Td`);
    blocks.push(`(${escapePdfText(line)}) Tj`);
  });

  blocks.push("ET");
  const content = blocks.join("\n");

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function buildReportHtml(report: string, title: string): string {
  return `
    <div style="max-width: 820px; margin: 0 auto; background: white; padding: 32px; color: #0f172a; font-family: Arial, sans-serif;">
      <h1 style="font-size: 28px; margin: 0 0 16px; color: #0F4C81;">${title}</h1>
      <div style="border-left: 6px solid #46A6FF; padding-left: 16px; font-size: 18px; line-height: 1.7;">${report}</div>
    </div>
  `;
}

function wrapPdfText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}
