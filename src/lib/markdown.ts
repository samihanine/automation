import DOMPurify from "dompurify";
import { marked } from "marked";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

export function markdownToHtml(markdown: string) {
  return DOMPurify.sanitize(marked.parse(markdown, { gfm: true, async: false }));
}

export async function markdownToPdf(title: string, markdown: string) {
  const [pdfModule, vfsModule, { default: htmlToPdfmake }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
    import("html-to-pdfmake"),
  ]);
  const pdfMake = (pdfModule as unknown as { default?: typeof pdfModule }).default ?? pdfModule;
  pdfMake.addVirtualFileSystem(vfsModule.default);

  const document: TDocumentDefinitions = {
    info: { title },
    pageMargins: [40, 48, 40, 48],
    defaultStyle: { fontSize: 10.5, lineHeight: 1.25 },
    content: htmlToPdfmake(markdownToHtml(markdown), {
      window,
      defaultStyles: {
        h1: { fontSize: 20, bold: true, marginBottom: 8 },
        h2: { fontSize: 16, bold: true, marginTop: 10, marginBottom: 6 },
        h3: { fontSize: 13, bold: true, marginTop: 8, marginBottom: 4 },
        th: { bold: true, fillColor: "#f0f0f0" },
        code: { fontSize: 9, background: "#f5f5f5" },
      },
    }),
    footer: (page, count) => ({ text: `${page} / ${count}`, alignment: "center", fontSize: 8, color: "#999999" }),
  };
  return pdfMake.createPdf(document).getBlob();
}
