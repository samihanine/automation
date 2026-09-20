import { useEffect, useRef } from "react";
import { Bold, Italic, List, ImagePlus } from "lucide-react";
import { Button } from "./ui/button";
import { useAction } from "./table-context";
import { richDocument } from "@/lib/rich-text";

export function RichTextEditor({
  value,
  label,
  disabled,
  onChange,
}: {
  value: string;
  label: string;
  disabled: boolean;
  onChange(value: string): void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const change = useRef(onChange);
  const { run, busy, feedback } = useAction();
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const node = editor.current!;
    const html = richDocument(value).innerHTML;
    if (richDocument(node.innerHTML).innerHTML !== html) node.innerHTML = html;
  }, [value]);
  function remember() {
    const current = window.getSelection();
    if (current?.rangeCount && editor.current?.contains(current.anchorNode))
      selection.current = current.getRangeAt(0).cloneRange();
  }
  function command(name: string, content?: string) {
    if (!editor.current || disabled) return;
    editor.current!.focus();
    const current = window.getSelection();
    if (
      selection.current &&
      editor.current!.contains(selection.current.startContainer)
    ) {
      current?.removeAllRanges();
      current?.addRange(selection.current);
    }
    document.execCommand(name, false, content);
    change.current(richDocument(editor.current!.innerHTML).innerHTML);
    remember();
  }
  function insertImages(files: File[]) {
    const range = selection.current?.cloneRange();
    void run(async () => {
      const images = await Promise.all(
        files.map(async (file) => {
          if (!["image/png", "image/jpeg", "image/gif"].includes(file.type))
            throw new Error("Choose a PNG, JPEG or GIF image.");
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve(`<img src="${reader.result}" alt="Uploaded image">`);
            reader.onerror = () =>
              reject(new Error("Could not read this image."));
            reader.readAsDataURL(file);
          });
        }),
      );
      if (range) selection.current = range;
      command("insertHTML", images.join(""));
    });
  }
  return (
    <div className="overflow-hidden rounded-md border border-border bg-white">
      <div className="flex gap-0.5 border-b border-neutral-100 p-1">
        {(
          [
            ["bold", "Bold", Bold],
            ["italic", "Italic", Italic],
            ["insertUnorderedList", "Bullet list", List],
          ] as const
        ).map(([cmd, title, Icon]) => (
          <Button
            key={cmd}
            type="button"
            variant="ghost"
            size="icon-sm"
            title={title}
            aria-label={title}
            disabled={disabled || busy}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(cmd)}
          >
            <Icon />
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Upload image"
          aria-label="Upload image"
          disabled={disabled || busy}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            remember();
            upload.current?.click();
          }}
        >
          <ImagePlus />
        </Button>
        <input
          ref={upload}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) insertImages([file]);
          }}
        />
      </div>
      <div
        ref={editor}
        className="min-h-40 p-3 text-[13px] leading-relaxed whitespace-pre-wrap text-[#333] outline-none wrap-anywhere focus:shadow-[inset_0_0_0_1px_#b49a62] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_img]:my-2 [&_img]:block [&_img]:max-h-[400px] [&_img]:max-w-full [&_img]:object-contain"
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        aria-disabled={disabled}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={() =>
          onChange(richDocument(editor.current!.innerHTML).innerHTML)
        }
        onKeyUp={remember}
        onMouseUp={remember}
        onBlur={remember}
        onPaste={(e) => {
          e.preventDefault();
          if (disabled || busy) return;
          remember();
          const images = Array.from(e.clipboardData.items)
            .filter(
              (item) => item.kind === "file" && item.type.startsWith("image/"),
            )
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null);
          if (images.length) {
            insertImages(images);
            return;
          }
          command(
            "insertHTML",
            richDocument(
              e.clipboardData.getData("text/html") ||
                e.clipboardData.getData("text/plain"),
            ).innerHTML,
          );
        }}
        onDrop={(e) => e.preventDefault()}
      />
      {feedback}
    </div>
  );
}
