import { useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { optionBackground } from "@/lib/utils";
import type { Column, Row } from "@/schema/tableSchema";
import type { ReactNode } from "react";

export const fieldClassName =
  "flex flex-col gap-2 text-[13px] text-[#707070] [&>:is(input,select,textarea)]:min-h-[38px] [&>:is(input,select,textarea)]:w-full [&>:is(input,select,textarea)]:rounded-[5px] [&>:is(input,select,textarea)]:border [&>:is(input,select,textarea)]:border-input [&>:is(input,select,textarea)]:bg-white [&>:is(input,select,textarea)]:px-2.5 [&>:is(input,select,textarea)]:py-2 [&>:is(input,select,textarea)]:text-[#444] [&>:is(input,select,textarea)]:outline-none [&>:is(input,select,textarea):focus]:border-ring [&>:is(input,select,textarea):focus]:ring-2 [&>:is(input,select,textarea):focus]:ring-primary/5 [&_small]:text-[11px] [&_small]:text-neutral-400";

export const fileButtonClassName =
  "relative inline-flex min-h-[33px] cursor-pointer items-center gap-2 rounded-[5px] border border-input px-3 py-1.5 text-[13px] text-neutral-500 has-disabled:cursor-default has-disabled:opacity-45 [&>input]:absolute [&>input]:inset-0 [&>input]:size-full [&>input]:cursor-pointer [&>input]:opacity-0";

export const dialogClassName =
  "rounded-[10px] bg-white font-sans text-[#444] [&_form]:flex [&_form]:flex-col [&_form]:gap-[22px] [&_h2]:text-xl [&_h2]:font-semibold";

export const emptyClassName =
  "flex flex-1 flex-col items-center justify-center gap-4 px-6 py-[70px] text-center text-neutral-400 max-[760px]:px-[18px] max-[760px]:py-10 [&>svg]:text-[#b9ab8b] [&>svg]:stroke-[1.3] [&_h2]:text-[19px] [&_h2]:font-medium [&_h2]:text-neutral-600 [&_p]:text-[13px] [&_p]:leading-relaxed";

export const compactButtonsClassName =
  "[&_[data-slot=button]]:h-7 [&_[data-slot=button]]:min-h-7 [&_[data-slot=button]]:px-2 [&_[data-slot=button]]:py-1 [&_[data-slot=button]]:text-xs [&_[data-size^=icon]]:w-7 [&_[data-size^=icon]]:p-[5px]";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className={fieldClassName}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function OptionTag({
  column,
  value,
  label = value,
}: {
  column: Column;
  value: string;
  label?: string;
}) {
  return value ? (
    <Badge
      variant="secondary"
      className="inline-flex min-h-[22px] w-fit max-w-full items-center overflow-hidden rounded-full border border-black/6 px-2 py-0.5 text-[11px] leading-4 font-medium text-[#444]"
      title={column.name}
      style={{ backgroundColor: optionBackground(column, value) }}
    >
      {label}
    </Badge>
  ) : (
    <span className="text-[13px] text-neutral-400">—</span>
  );
}

export function RowTags({ columns, row }: { columns: Column[]; row: Row }) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-1 empty:hidden">
      {columns
        .filter((c) => c.type === "select" && row[c.id])
        .map((c) => (
          <OptionTag key={c.id} column={c} value={String(row[c.id])} />
        ))}
    </span>
  );
}

export function TableOptions({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Table options"
            title="Table options"
          />
        }
      >
        <EllipsisVertical />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[205px] rounded-lg p-1.5">
        <div
          className="flex flex-col items-stretch gap-0.5 [&>*]:m-0 [&>*]:w-full [&>*]:justify-start [&>*]:text-xs"
          onClick={(e) => {
            if ((e.target as Element).closest("button")) setOpen(false);
          }}
          onChange={() => setOpen(false)}
        >
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
