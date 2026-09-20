import ExcelJS from "exceljs";
import { typeNames } from "@/schema/tableSchema";
import type { Adapter, Column, Row } from "@/schema/tableSchema";
import { workspaceDirectory } from "./workspace";
import { download } from "./local-storage";
import { optionBackground } from "./utils";
import { richDocument, richParts, richPlain } from "./rich-text";

function richValues(book: ExcelJS.Workbook) {
  const values = new Map<string, string>();
  const meta = book.getWorksheet("_richText");
  if (meta?.getCell("A1").text !== "atelier-rich-text-v1") return values;
  meta.eachRow((row, index) => {
    if (index === 1) return;
    const key = `${row.getCell(1).text}:${row.getCell(2).text}`;
    values.set(key, (values.get(key) ?? "") + row.getCell(3).text);
  });
  return values;
}

function readRich(cell: ExcelJS.Cell, saved?: string) {
  if (saved && richParts(saved).text === cell.text) return saved;
  const value = cell.value;
  if (value && typeof value === "object" && "richText" in value) {
    const root = richDocument("");
    for (const run of value.richText) {
      let node: Node = root.ownerDocument.createTextNode(run.text);
      for (const tag of [
        run.font?.bold && "strong",
        run.font?.italic && "em",
      ]) {
        if (!tag) continue;
        const wrapper = root.ownerDocument.createElement(tag);
        wrapper.append(node);
        node = wrapper;
      }
      root.append(node);
    }
    return `<div>${root.innerHTML}</div>`;
  }
  return richDocument(cell.text).innerHTML;
}

export function fileName(name: string) {
  if (!name.trim() || /[\\/:*?"<>|\x00-\x1f]/.test(name) || /[. ]$/.test(name))
    throw new Error("Choose a valid file name for the table.");
  return `${name}.xlsx`;
}
async function makeWorkbook(columns: Column[], rows: Row[], internal: boolean) {
  const book = new ExcelJS.Workbook();
  book.creator = "Atelier";
  const sheet = book.addWorksheet("Data");
  const legend = book.addWorksheet("Legend");
  let maxChoices = 0;
  for (const column of columns) {
    const choices =
      column.type === "select"
        ? [
            ...new Set(
              (column.options?.choices ?? [])
                .map((v) => v.trim())
                .filter(Boolean),
            ),
          ]
        : [];
    maxChoices = Math.max(maxChoices, choices.length);
    const row = legend.addRow([
      column.name,
      column.description ?? "",
      typeNames[column.type],
      ...choices,
    ]);
    choices.forEach((choice, i) => {
      row.getCell(4 + i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF" + optionBackground(column, choice)!.slice(1).toUpperCase(),
        },
      };
    });
  }
  legend.spliceRows(1, 0, [
    "Column",
    "Description",
    "Type",
    ...Array.from({ length: Math.max(1, maxChoices) }, (_, i) =>
      i === 0 ? "Options" : "",
    ),
  ]);
  legend.autoFilter = {
    from: "A1",
    to: `${legend.getColumn(3 + Math.max(1, maxChoices)).letter}${legend.rowCount}`,
  };
  legend.views = [{ state: "frozen", ySplit: 1 }];
  const offset = internal ? 1 : 0;
  sheet.addRow([...(internal ? ["_id"] : []), ...columns.map((c) => c.name)]);
  rows.forEach((r) =>
    sheet.addRow([
      ...(internal ? [r.id] : []),
      ...columns.map((c) => (c.type === "richText" ? null : (r[c.id] ?? null))),
    ]),
  );
  let richMeta: ExcelJS.Worksheet | undefined;
  let images: ExcelJS.Worksheet | undefined;
  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, column] of columns.entries()) {
      if (column.type !== "richText" || !row[column.id]) continue;
      const rich = richParts(String(row[column.id]));
      if (rich.text.length > 32767)
        throw new Error(
          `Row ${rowIndex + 1}, ${column.name}: Excel supports at most 32,767 text characters per cell.`,
        );
      sheet.getCell(rowIndex + 2, columnIndex + offset + 1).value = {
        richText: rich.runs.length ? rich.runs : [{ text: "" }],
      };
      if (!richMeta) {
        richMeta = book.addWorksheet("_richText", { state: "veryHidden" });
        richMeta.addRow(["atelier-rich-text-v1"]);
      }
      const html = rich.html;
      for (let start = 0; start < html.length;) {
        let end = Math.min(start + 30000, html.length);
        if (end < html.length && /[\uD800-\uDBFF]/.test(html[end - 1])) end--;
        richMeta.addRow([
          internal ? row.id : String(rowIndex + 2),
          String(columnIndex + offset + 1),
          html.slice(start, end),
        ]);
        start = end;
      }
      for (const src of rich.images) {
        if (!images) {
          images = book.addWorksheet("Images");
          images.columns = [
            { header: "Record / column", width: 32 },
            { header: "Image", width: 48 },
          ];
          images.getRow(1).font = { bold: true };
        }
        const image = new Image();
        image.src = src;
        await image.decode();
        const scale = Math.min(
          320 / image.naturalWidth,
          160 / image.naturalHeight,
          1,
        );
        const index = images.addRow([
          `Row ${rowIndex + 1} · ${column.name}`,
        ]).number;
        images.getRow(index).height = 126;
        const extension = src
          .match(/^data:image\/(png|jpeg|gif)/i)![1]
          .toLowerCase() as "png" | "jpeg" | "gif";
        images.addImage(book.addImage({ base64: src, extension }), {
          tl: { col: 1, row: index - 1 },
          ext: {
            width: image.naturalWidth * scale,
            height: image.naturalHeight * scale,
          },
          editAs: "oneCell",
        });
      }
    }
  }
  const edge = { style: "thin" as const, color: { argb: "FFE2E2E2" } };
  for (const page of [sheet, legend]) {
    page.columns.forEach((c) => {
      c.width = 32;
    });
    page.properties.defaultRowHeight = 40;
    for (let i = 1; i <= page.rowCount; i++) {
      const row = page.getRow(i);
      row.height = 40;
      for (let j = 1; j <= page.columnCount; j++) {
        const cell = row.getCell(j);
        cell.border = { top: edge, bottom: edge, left: edge, right: edge };
        cell.alignment = { vertical: "middle", wrapText: true };
        if (i === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F0F0" },
          };
          cell.font = { bold: true };
        }
      }
    }
  }
  if (columns.length)
    sheet.autoFilter = {
      from: { row: 1, column: offset + 1 },
      to: { row: rows.length + 1, column: columns.length + offset },
    };
  let optionsSheet: ExcelJS.Worksheet | undefined;
  columns.forEach((c, i) => {
    if (c.type !== "select") return;
    rows.forEach((r, rowIndex) => {
      const background = optionBackground(c, r[c.id]);
      if (!background) return;
      sheet.getCell(rowIndex + 2, i + offset + 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + background.slice(1).toUpperCase() },
      };
    });
    const letter = sheet.getColumn(i + offset + 1).letter;
    const choices = [
      ...new Set(
        (c.options?.choices ?? []).map((v) => v.trim()).filter(Boolean),
      ),
    ];
    if (choices.length) {
      if (!optionsSheet)
        optionsSheet = book.addWorksheet("_options", { state: "veryHidden" });
      const optionLetter = optionsSheet.getColumn(i + 1).letter;
      choices.forEach((choice, r) => {
        optionsSheet!.getCell(r + 1, i + 1).value = choice;
      });
      (
        sheet as unknown as {
          dataValidations: {
            add(range: string, model: ExcelJS.DataValidation): void;
          };
        }
      ).dataValidations.add(`${letter}2:${letter}1048576`, {
        type: "list",
        allowBlank: true,
        formulae: [
          `_options!$${optionLetter}$1:$${optionLetter}$${choices.length}`,
        ],
        // Keep the dropdown, but let people type values outside the list too.
        showErrorMessage: false,
      });
    }
    choices.forEach((choice, priority) =>
      sheet.addConditionalFormatting({
        ref: `${letter}2:${letter}1048576`,
        rules: [
          {
            type: "expression",
            priority: priority + 1,
            formulae: [`${letter}2="${choice.replaceAll('"', '""')}"`],
            style: {
              fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                  argb:
                    "FF" + optionBackground(c, choice)!.slice(1).toUpperCase(),
                },
              },
            },
          },
        ],
      }),
    );
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (internal) {
    const meta = book.addWorksheet("_atelier", { state: "veryHidden" });
    meta.addRow(columns.map((c) => c.id));
    sheet.getColumn(1).hidden = true;
  }
  return book;
}
export function xlsxAdapter(folderId: string): Adapter {
  const versions = new Map<string, number>();
  return {
    async rename(binding, resource, commit) {
      const oldName = fileName(binding.resource);
      const newName = fileName(resource);
      if (oldName === newName) return;
      const dir = await workspaceDirectory(folderId);
      const source = await dir.getFileHandle(oldName);
      const file = await source.getFile();
      if (file.lastModified !== versions.get(oldName))
        throw new Error(
          "This workbook has changed. Reload it before renaming.",
        );
      let existing: FileSystemFileHandle | undefined;
      try {
        existing = await dir.getFileHandle(newName);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "NotFoundError")) throw e;
      }
      if (existing)
        throw new Error(
          "A workbook already uses this name. Choose a different name.",
        );
      const data = await file.arrayBuffer();
      const target = await dir.getFileHandle(newName, { create: true });
      let removed = false;
      try {
        const stream = await target.createWritable();
        try {
          await stream.write(data);
          await stream.close();
        } catch (e) {
          await stream.abort().catch(() => {});
          throw e;
        }
        const version = (await target.getFile()).lastModified;
        if ((await source.getFile()).lastModified !== file.lastModified)
          throw new Error(
            "This workbook changed while renaming. Reload it and try again.",
          );
        await dir.removeEntry(oldName);
        removed = true;
        commit();
        versions.delete(oldName);
        versions.set(newName, version);
      } catch (error) {
        try {
          if (removed) {
            const restored = await dir.getFileHandle(oldName, { create: true });
            const stream = await restored.createWritable();
            await stream.write(data);
            await stream.close();
            versions.set(oldName, (await restored.getFile()).lastModified);
          }
          await dir.removeEntry(newName);
        } catch {
          throw new Error(
            `Rename could not finish. Your workbook is preserved as "${newName}" or "${oldName}". Restore folder access and reload before continuing.`,
          );
        }
        throw error;
      }
    },
    async read(_table, columns, binding) {
      const name = fileName(binding.resource);
      const dir = await workspaceDirectory(folderId);
      let handle: FileSystemFileHandle;
      try {
        handle = await dir.getFileHandle(name);
      } catch (e) {
        if (e instanceof DOMException && e.name === "NotFoundError") {
          versions.set(name, -1);
          return [];
        }
        throw e;
      }
      const input = await handle.getFile();
      versions.set(name, input.lastModified);
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await input.arrayBuffer());
      const sheet = book.getWorksheet("Data") ?? book.worksheets[0];
      if (!sheet) return [];
      const meta = book.getWorksheet("_atelier");
      const rich = richValues(book);
      const headers = new Map<string, number>();
      sheet.getRow(1).eachCell((cell, i) => headers.set(cell.text, i));
      const ids = new Map<string, number>();
      meta?.getRow(1).eachCell((cell, i) => ids.set(cell.text, i + 1));
      const rows: Row[] = [];
      sheet.eachRow((row, i) => {
        if (i === 1) return;
        const item: Row = {
          id:
            (headers.has("_id") ? row.getCell(headers.get("_id")!).text : "") ||
            crypto.randomUUID(),
        };
        for (const c of columns) {
          const index = ids.get(c.id) ?? headers.get(c.name);
          const cell = index ? row.getCell(index) : null;
          item[c.id] =
            !cell || cell.value === null
              ? null
              : c.type === "richText"
                ? readRich(cell, rich.get(`${meta ? item.id : i}:${index}`))
                : c.type === "boolean"
                  ? cell.value === true || cell.text === "true"
                  : c.type === "number"
                    ? Number(cell.result ?? cell.value)
                    : cell.value instanceof Date
                      ? cell.value.toISOString().slice(0, 10)
                      : cell.text;
        }
        rows.push(item);
      });
      return rows;
    },
    async write(_table, columns, binding, rows) {
      const name = fileName(binding.resource);
      const dir = await workspaceDirectory(folderId);
      let previous: File | undefined;
      try {
        previous = await (await dir.getFileHandle(name)).getFile();
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "NotFoundError")) throw e;
      }
      if (previous && previous.lastModified !== versions.get(name))
        throw new Error(
          "This file already exists or has changed. Reload it before saving.",
        );
      const data = new Uint8Array(
        await (await makeWorkbook(columns, rows, true)).xlsx.writeBuffer(),
      );
      const handle = await dir.getFileHandle(name, { create: true });
      const stream = await handle.createWritable();
      await stream.write(data);
      await stream.close();
      versions.set(name, (await handle.getFile()).lastModified);
    },
  };
}
export async function exportRows(columns: Column[], rows: Row[], name: string) {
  download(
    new Uint8Array(
      await (await makeWorkbook(columns, rows, false)).xlsx.writeBuffer(),
    ),
    `${name}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
export function delimitedRows(
  columns: Column[],
  rows: Row[],
  delimiter: string,
) {
  const cell = (v: unknown) => {
    const text = String(v ?? "");
    const safe =
      typeof v === "string" && /^[=+@\-]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [
    columns.map((c) => c.name),
    ...rows.map((r) =>
      columns.map((c) =>
        c.type === "richText" ? richPlain(r[c.id]) : r[c.id],
      ),
    ),
  ]
    .map((row) => row.map(cell).join(delimiter))
    .join("\r\n");
}

export type ImportSheet = {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
};
export async function readImport(file: File): Promise<ImportSheet[]> {
  if (/\.xlsx$/i.test(file.name)) {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await file.arrayBuffer());
    const rich = richValues(book);
    return book.worksheets
      .filter(
        (s) =>
          s.state === "visible" &&
          !(
            s.name === "Legend" &&
            book.creator === "Atelier" &&
            book.getWorksheet("Data")
          ) &&
          !(s.name === "Images" && book.getWorksheet("_richText")),
      )
      .map((sheet) => {
        const headers = Array.from(
          { length: sheet.columnCount },
          (_, i) => sheet.getRow(1).getCell(i + 1).text || `Column ${i + 1}`,
        );
        const rows: ImportSheet["rows"] = [];
        sheet.eachRow((row, i) => {
          if (i === 1) return;
          rows.push(
            headers.map((_, j) => {
              const cell = row.getCell(j + 1);
              const saved =
                sheet.name === "Data"
                  ? rich.get(
                      `${book.getWorksheet("_atelier") ? row.getCell(1).text : i}:${j + 1}`,
                    )
                  : undefined;
              const value = cell.result ?? cell.value;
              if (
                saved ||
                (value && typeof value === "object" && "richText" in value)
              )
                return readRich(cell, saved);
              return value === null
                ? null
                : value instanceof Date
                  ? value.toISOString().slice(0, 10)
                  : typeof value === "boolean" || typeof value === "number"
                    ? value
                    : cell.text;
            }),
          );
        });
        const indices = headers
          .map((_, i) => i)
          .filter(
            (i) => !(book.getWorksheet("_atelier") && headers[i] === "_id"),
          );
        return {
          name: sheet.name,
          headers: indices.map((i) => headers[i]),
          rows: rows.map((row) => indices.map((i) => row[i])),
        };
      });
  }
  if (!/\.csv$/i.test(file.name))
    throw new Error("Choose an .xlsx or .csv file.");
  const text = (await file.text()).replace(/^\uFEFF/, "");
  function parse(delimiter: string) {
    const records: string[][] = [];
    let row: string[] = [],
      value = "",
      quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          value += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === delimiter && !quoted) {
        row.push(value);
        value = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        row.push(value);
        if (row.some((v) => v !== "")) records.push(row);
        row = [];
        value = "";
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else value += c;
    }
    if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
    row.push(value);
    if (row.some((v) => v !== "")) records.push(row);
    return records;
  }
  const records = [",", ";", "\t"]
    .map(parse)
    .sort((a, b) => (b[0]?.length ?? 0) - (a[0]?.length ?? 0))[0];
  if (!records.length) throw new Error("This file is empty.");
  return [
    {
      name: file.name,
      headers: records[0].map((s, i) => s || `Column ${i + 1}`),
      rows: records.slice(1),
    },
  ];
}
export function mapImport(
  sheet: ImportSheet,
  mapping: Record<string, string>,
  columns: Column[],
): Row[] {
  if (!columns.some((c) => mapping[c.id] !== undefined && mapping[c.id] !== ""))
    throw new Error("Map at least one column.");
  return sheet.rows.map((values, i) => {
    const row: Row = { id: crypto.randomUUID() };
    for (const c of columns) {
      const index = mapping[c.id];
      const value =
        index === "" || index === undefined ? null : values[Number(index)];
      if (value === null || value === undefined || value === "") {
        row[c.id] = null;
        continue;
      }
      const text = String(value).trim();
      let converted: Row[string] = text;
      if (c.type === "richText") converted = richDocument(text).innerHTML;
      if (c.type === "number") {
        converted = Number(text);
        if (!Number.isFinite(converted))
          throw new Error(`Row ${i + 2}, ${c.name}: expected a number.`);
      }
      if (c.type === "boolean") {
        if (
          !["true", "false", "1", "0", "yes", "no"].includes(text.toLowerCase())
        )
          throw new Error(
            `Row ${i + 2}, ${c.name}: expected true/false, yes/no or 1/0.`,
          );
        converted = ["true", "1", "yes"].includes(text.toLowerCase());
      }
      if (
        c.type === "date" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(text) ||
          Number.isNaN(Date.parse(text)) ||
          new Date(text).toISOString().slice(0, 10) !== text)
      )
        throw new Error(`Row ${i + 2}, ${c.name}: use YYYY-MM-DD.`);
      if (
        c.type === "select" &&
        !(c.options?.choices ?? []).map((v) => v.trim()).includes(text)
      )
        throw new Error(
          `Row ${i + 2}, ${c.name}: "${text}" is not a configured option.`,
        );
      row[c.id] = converted;
    }
    return row;
  });
}

export function inferColumns(sheet: ImportSheet, tableKey: string): Column[] {
  return sheet.headers.map((header, index) => {
    const values = sheet.rows
      .map((row) => row[index])
      .filter((v) => v !== null && v !== undefined && v !== "");
    const type = !values.length
      ? "text"
      : values.every(
            (v) => typeof v === "boolean" || /^(true|false)$/i.test(String(v)),
          )
        ? "boolean"
        : values.every(
              (v) =>
                typeof v === "number" ||
                /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(String(v)),
            )
          ? "number"
          : values.every(
                (v) =>
                  /^\d{4}-\d{2}-\d{2}$/.test(String(v)) &&
                  !Number.isNaN(Date.parse(String(v))),
              )
            ? "date"
            : values.some((v) =>
                  /<(div|p|strong|b|em|i|ul|ol|li|img)(\s|>)/i.test(String(v)),
                )
              ? "richText"
              : "text";
    return {
      id: crypto.randomUUID(),
      tableKey,
      name: header || `Column ${index + 1}`,
      type,
    };
  });
}
