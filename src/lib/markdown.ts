import { Lexer } from "marked";
import type { Token, Tokens } from "marked";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

type Inline = { text: string; bold?: boolean; italics?: boolean; color?: string; decoration?: "underline" | "lineThrough"; link?: string; font?: string };

function inline(tokens: Token[] = [], style: Omit<Inline, "text"> = {}): Inline[] {
  return tokens.flatMap((token): Inline[] => {
    switch (token.type) {
      case "strong":
        return inline((token as Tokens.Strong).tokens, { ...style, bold: true });
      case "em":
        return inline((token as Tokens.Em).tokens, { ...style, italics: true });
      case "del":
        return inline((token as Tokens.Del).tokens, { ...style, decoration: "lineThrough" });
      case "link":
        return inline((token as Tokens.Link).tokens, {
          ...style,
          color: "#2563eb",
          decoration: "underline",
          link: (token as Tokens.Link).href,
        });
      case "codespan":
        return [{ ...style, text: (token as Tokens.Codespan).text, color: "#b45309" }];
      case "br":
        return [{ text: "\n" }];
      case "text":
      case "escape":
        return "tokens" in token && token.tokens
          ? inline(token.tokens, style)
          : [{ ...style, text: decode(token.text) }];
      default:
        return [{ ...style, text: decode(token.raw) }];
    }
  });
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const headingSizes = [20, 16, 14, 12, 11, 10];

function block(token: Token): Content | null {
  switch (token.type) {
    case "heading": {
      const heading = token as Tokens.Heading;
      return {
        text: inline(heading.tokens),
        fontSize: headingSizes[heading.depth - 1],
        bold: true,
        margin: [0, heading.depth === 1 ? 4 : 10, 0, 6],
      };
    }
    case "paragraph":
      return { text: inline((token as Tokens.Paragraph).tokens), margin: [0, 0, 0, 8] };
    case "list": {
      const list = token as Tokens.List;
      const items = list.items.map((item) => {
        const content = item.tokens.map(block).filter(Boolean) as Content[];
        return content.length === 1 ? content[0] : { stack: content };
      });
      return list.ordered
        ? { ol: items, margin: [0, 0, 0, 8] }
        : { ul: items, margin: [0, 0, 0, 8] };
    }
    case "text":
      return { text: inline((token as Tokens.Text).tokens ?? [token]) };
    case "blockquote":
      return {
        stack: (token as Tokens.Blockquote).tokens.map(block).filter(Boolean) as Content[],
        margin: [12, 0, 0, 8],
        color: "#555555",
        italics: true,
      };
    case "code":
      return {
        table: {
          widths: ["*"],
          body: [[{ text: (token as Tokens.Code).text, fontSize: 9, color: "#333333" }]],
        },
        layout: { fillColor: () => "#f5f5f5", hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 0, 0, 8],
      };
    case "table": {
      const table = token as Tokens.Table;
      return {
        table: {
          headerRows: 1,
          widths: table.header.map(() => "*"),
          body: [
            table.header.map((cell) => ({ text: inline(cell.tokens), bold: true, fillColor: "#f0f0f0" })),
            ...table.rows.map((row) => row.map((cell) => ({ text: inline(cell.tokens) }))),
          ],
        },
        layout: "lightHorizontalLines",
        fontSize: 9,
        margin: [0, 0, 0, 10],
      };
    }
    case "hr":
      return {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }],
        margin: [0, 6, 0, 10],
      };
    default:
      return null;
  }
}

export async function markdownToPdf(title: string, markdown: string) {
  const [pdfModule, vfsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake =
    (pdfModule as unknown as { default?: typeof pdfModule }).default ?? pdfModule;
  pdfMake.addVirtualFileSystem(vfsModule.default);

  const document: TDocumentDefinitions = {
    info: { title },
    pageMargins: [40, 48, 40, 48],
    defaultStyle: { fontSize: 10.5, lineHeight: 1.25 },
    content: new Lexer({ gfm: true }).lex(markdown).map(block).filter(Boolean) as Content[],
    footer: (page, count) => ({
      text: `${page} / ${count}`,
      alignment: "center",
      fontSize: 8,
      color: "#999999",
    }),
  };
  return pdfMake.createPdf(document).getBlob();
}
