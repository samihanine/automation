import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, ArrowUpIcon, FileIcon, InfoIcon, PaperclipIcon, SquareIcon, WrenchIcon, XIcon } from "lucide-react";
import { RichMarkdown } from "@/components/rich-markdown";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { stopAgent, useAgentRun } from "@/features/agent/run-agent";
import { getFile } from "@/lib/llm";
import { modelIds, models } from "@/lib/models";
import type { ModelId } from "@/lib/models";
import { cn } from "@/lib/utils";
import type { ConversationEvent } from "./conversation-schema";

type ChatProps = {
  conversationId?: string;
  events: ConversationEvent[];
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  onSend: (message: string, files: File[]) => void;
  disabledReason?: string;
};

export function Chat({ conversationId, events, model, onModelChange, onSend, disabledReason }: ChatProps) {
  const step = useAgentRun(conversationId);
  const running = step !== null;
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [events.length, running]);

  const send = () => {
    const message = draft.trim();
    if (!message || running || disabledReason) return;
    onSend(message, files);
    setDraft("");
    setFiles([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {events.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {disabledReason ?? "Ask a question about the dataset, or open an artefact on the right and describe what to build."}
            </p>
          )}
          {events.map((event) => (
            <EventView key={event.id} event={event} />
          ))}
          {running && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3.5" />
              {step === 0 ? "Thinking…" : `Working… step ${step}`}
            </div>
          )}
          <div ref={bottom} />
        </div>
      </div>

      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {files.map((file, index) => (
                <span key={index} className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs">
                  <FileIcon className="size-3" />
                  {file.name}
                  <button type="button" onClick={() => setFiles(files.filter((_, other) => other !== index))} aria-label="Remove file">
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <NativeSelect size="sm" aria-label="Model" value={model} onChange={(event) => onModelChange(event.target.value as ModelId)}>
              {modelIds.map((id) => (
                <option key={id} value={id}>
                  {models[id].label}
                </option>
              ))}
            </NativeSelect>
            <Button type="button" variant="ghost" size="icon" onClick={() => input.current?.click()} aria-label="Attach files" disabled={Boolean(disabledReason)}>
              <PaperclipIcon />
            </Button>
            <input
              ref={input}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                setFiles([...files, ...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={disabledReason ?? "Ask the agent…"}
              disabled={Boolean(disabledReason)}
              rows={1}
              className="max-h-40 min-h-9 flex-1 resize-none"
            />
            {running && conversationId ? (
              <Button type="button" variant="outline" size="icon" onClick={() => stopAgent(conversationId)} aria-label="Stop">
                <SquareIcon />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!draft.trim() || Boolean(disabledReason)} aria-label="Send">
                <ArrowUpIcon />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function FileEvent({ file }: { file: NonNullable<ConversationEvent["file"]> }) {
  const { data: url } = useQuery({
    queryKey: ["file-url", file.id],
    queryFn: async () => {
      const stored = await getFile(file.id);
      return stored ? URL.createObjectURL(stored.blob) : null;
    },
    enabled: file.type.startsWith("image/"),
    staleTime: Infinity,
  });
  return (
    <div className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
      {url && <img src={url} alt={file.name} className="max-h-48 rounded-lg border" />}
      <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground">
        <FileIcon className="size-3" />
        {file.name}
      </span>
    </div>
  );
}

function EventView({ event }: { event: ConversationEvent }) {
  if (event.kind === "file" && event.file) return <FileEvent file={event.file} />;
  if (event.kind === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
        {event.text}
      </div>
    );
  }
  if (event.kind === "assistant") return <RichMarkdown className="max-w-[95%] text-sm">{event.text}</RichMarkdown>;
  const Icon = event.kind === "tool" ? WrenchIcon : event.kind === "error" ? AlertCircleIcon : InfoIcon;
  const hasDetails = event.input !== undefined || event.output !== undefined;
  return (
    <details className={cn("group text-xs text-muted-foreground", event.kind === "error" && "text-destructive")}>
      <summary className={cn("flex list-none items-center gap-1.5", hasDetails && "cursor-pointer hover:text-foreground")}>
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{event.text}</span>
        {event.durationMs !== undefined && <span className="shrink-0 opacity-60">· {(event.durationMs / 1000).toFixed(1)}s</span>}
      </summary>
      {hasDetails && (
        <div className="mt-1.5 space-y-1.5 rounded-md border bg-muted/50 p-2 font-mono text-[11px]">
          {event.thought && <p className="font-sans italic">{event.thought}</p>}
          {event.input !== undefined && <Json label="input" value={event.input} />}
          {event.output !== undefined && <Json label="output" value={event.output} />}
        </div>
      )}
    </details>
  );
}

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="mb-0.5 font-sans font-medium">{label}</div>
      <pre className="max-h-60 overflow-auto break-all whitespace-pre-wrap">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
