export function richDocument(value: string) {
  const doc = document.implementation.createHTMLDocument("");
  const root = doc.createElement("div");
  if (/<\/?[a-z][\s\S]*>/i.test(value)) root.innerHTML = value;
  else if (value) {
    const paragraph = doc.createElement("div");
    paragraph.textContent = value;
    root.append(paragraph);
  }
  for (const node of Array.from(root.querySelectorAll("*"))) {
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG"].includes(node.tagName)) {
      node.remove();
      continue;
    }
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") ?? "";
      if (!/^data:image\/(png|jpeg|gif);base64,[a-z0-9+/=\s]+$/i.test(src)) {
        node.remove();
        continue;
      }
      for (const attr of Array.from(node.attributes))
        node.removeAttribute(attr.name);
      node.setAttribute("src", src);
      node.setAttribute("alt", "Uploaded image");
    } else if (
      ["B", "STRONG", "I", "EM", "UL", "OL", "LI", "P", "DIV", "BR"].includes(
        node.tagName,
      )
    ) {
      for (const attr of Array.from(node.attributes))
        node.removeAttribute(attr.name);
    } else node.replaceWith(...Array.from(node.childNodes));
  }
  return root;
}

export function richParts(value: string) {
  const root = richDocument(value);
  const runs: { text: string; font?: { bold?: boolean; italic?: boolean } }[] =
    [];
  const images: string[] = [];
  const append = (text: string, font = {}) => runs.push({ text, font });
  const newline = () => {
    if (runs.length && !runs[runs.length - 1].text.endsWith("\n")) append("\n");
  };
  function visit(node: Node, font: { bold?: boolean; italic?: boolean } = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      append(node.textContent ?? "", font);
      return;
    }
    if (!(node instanceof Element)) return;
    const tag = node.tagName;
    if (["DIV", "P", "LI"].includes(tag)) newline();
    if (tag === "LI") append("• ", font);
    if (tag === "BR") append("\n", font);
    if (tag === "IMG") {
      images.push(node.getAttribute("src")!);
      append("[Image]", font);
    }
    const next = {
      ...font,
      ...(["B", "STRONG"].includes(tag) ? { bold: true } : {}),
      ...(["I", "EM"].includes(tag) ? { italic: true } : {}),
    };
    node.childNodes.forEach((child) => visit(child, next));
    if (["DIV", "P", "LI"].includes(tag)) newline();
  }
  root.childNodes.forEach((node) => visit(node));
  return {
    html: root.innerHTML,
    runs,
    images,
    text: runs.map((r) => r.text).join(""),
  };
}

export function richPlain(value: unknown) {
  return richParts(String(value ?? "")).text.trimEnd();
}
