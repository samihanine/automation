declare module "html-to-pdfmake" {
  import type { Content } from "pdfmake/interfaces";
  export default function htmlToPdfmake(html: string, options?: { window?: Window; defaultStyles?: Record<string, unknown> }): Content;
}
