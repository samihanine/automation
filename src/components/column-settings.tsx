import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";

const OPTION_COLORS = [
  "#b49a62",
  "#c0392b",
  "#e74c3c",
  "#e67e22",
  "#f39c12",
  "#f1c40f",
  "#2ecc71",
  "#27ae60",
  "#16a085",
  "#1abc9c",
  "#3498db",
  "#2980b9",
  "#9b59b6",
  "#8e44ad",
  "#34495e",
  "#7f8c8d",
] as const;

const DEFAULT_OPTION_COLOR = OPTION_COLORS[0];
import { useAction, useWorkspace } from "./table-context";
import { Field } from "./table-ui";
import { columnTypes, typeNames } from "@/schema/tableSchema";
import type { Column } from "@/schema/tableSchema";

export function ColumnSettings({
  column,
  columns,
  close,
  save,
}: {
  column: Column;
  columns: Column[];
  close(): void;
  save(columns: Column[]): Promise<void>;
}) {
  const { schema } = useWorkspace();
  const [draft, setDraft] = useState(column);
  const [position, setPosition] = useState(
    Math.max(
      0,
      columns.findIndex((c) => c.id === column.id),
    ),
  );
  const { run, busy, feedback } = useAction();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <SheetContent className="w-full! max-w-[420px]! overflow-auto bg-white font-sans [&_form]:px-6 [&_form]:pb-6 [&_fieldset]:flex [&_fieldset]:flex-col [&_fieldset]:gap-[22px] [&_fieldset]:border-0 [&_fieldset]:p-0 [&_[data-slot=sheet-title]]:text-lg">
        <SheetHeader>
          <SheetTitle>Column settings</SheetTitle>
          <SheetDescription>
            Edit the table schema directly. Save the table to update its Excel
            file.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (!draft.name.trim()) throw new Error("Enter a column name.");
              if (draft.type === "relation" && !draft.options?.sourceTableKey)
                throw new Error("Choose a related table.");
              const next = columns.filter((c) => c.id !== draft.id);
              next.splice(Math.min(position, next.length), 0, {
                ...draft,
                name: draft.name.trim(),
              });
              await save(next);
              close();
            });
          }}
        >
          <fieldset disabled={busy}>
            <Field label="Name">
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="Explain what this column contains…"
              />
            </Field>
            <Field label="Type">
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as Column["type"] })
                }
              >
                {columnTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeNames[type]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Position">
              <select
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
              >
                {Array.from(
                  {
                    length: columns.some((c) => c.id === draft.id)
                      ? columns.length
                      : columns.length + 1,
                  },
                  (_, i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ),
                )}
              </select>
            </Field>
            {draft.type === "relation" && (
              <Field label="Related table schema">
                <select
                  required
                  value={draft.options?.sourceTableKey ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      options: {
                        ...draft.options,
                        sourceTableKey: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">Choose a table</option>
                  {schema["dataset-table"].map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {draft.type === "select" && (
              <div className="grid min-w-[235px] gap-[7px] [&>div]:flex [&>div]:items-center [&>div]:gap-1.5 [&_input]:min-w-0 [&_input]:w-full [&_input]:rounded [&_input]:border [&_input]:border-input [&_input]:p-2 [&_input[type=color]]:size-[30px] [&_input[type=color]]:min-w-[30px] [&_input[type=color]]:cursor-pointer [&_input[type=color]]:p-0.5">
                {(draft.options?.choices ?? []).map((choice, i) => (
                  <div key={i}>
                    <input
                      aria-label="Option name"
                      value={choice}
                      onChange={(e) => {
                        const choices = [...draft.options!.choices!];
                        choices[i] = e.target.value;
                        setDraft({
                          ...draft,
                          options: {
                            ...draft.options,
                            choices,
                            colors: {
                              ...draft.options?.colors,
                              [e.target.value.trim()]:
                                draft.options?.colors?.[choice.trim()] ??
                                DEFAULT_OPTION_COLOR,
                            },
                          },
                        });
                      }}
                    />
                    {(() => {
                      const current =
                        draft.options?.colors?.[choice.trim()] ??
                        DEFAULT_OPTION_COLOR;
                      return (
                        <Popover>
                          <PopoverTrigger
                            type="button"
                            aria-label={`Color for ${choice}`}
                            className="size-[30px] min-w-[30px] shrink-0 cursor-pointer rounded border border-input"
                            style={{ backgroundColor: current }}
                          />
                          <PopoverContent className="w-auto p-2">
                            <div className="grid grid-cols-8 gap-1">
                              {OPTION_COLORS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  aria-label={color}
                                  className="flex size-6 items-center justify-center rounded border border-input"
                                  style={{ backgroundColor: color }}
                                  onClick={() =>
                                    setDraft({
                                      ...draft,
                                      options: {
                                        ...draft.options,
                                        colors: {
                                          ...draft.options?.colors,
                                          [choice.trim()]: color,
                                        },
                                      },
                                    })
                                  }
                                >
                                  {current.toLowerCase() ===
                                    color.toLowerCase() && (
                                    <Check className="size-3.5 text-white" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })()}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove option"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          options: {
                            ...draft.options,
                            choices: draft.options?.choices?.filter(
                              (_, j) => i !== j,
                            ),
                          },
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      options: {
                        ...draft.options,
                        choices: [
                          ...(draft.options?.choices ?? []),
                          "New option",
                        ],
                      },
                    })
                  }
                >
                  <Plus />
                  Add option
                </Button>
              </div>
            )}
            {feedback}
            <Button type="submit">Apply column settings</Button>
            {columns.some((c) => c.id === draft.id) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  void run(async () => {
                    if (
                      !window.confirm(
                        "Remove this column? Its cells will be removed from the workbook when you save the table.",
                      )
                    )
                      return;
                    await save(columns.filter((c) => c.id !== draft.id));
                    close();
                  })
                }
              >
                <Trash2 />
                Delete column
              </Button>
            )}
          </fieldset>
        </form>
      </SheetContent>
    </Sheet>
  );
}
