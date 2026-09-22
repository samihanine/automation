import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircleIcon, ArrowUpIcon, InfoIcon, SquareIcon, WrenchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { sendUserMessage, stopAgent, useAgentRun } from "@/features/agent/run-agent";
import { artefacts } from "@/features/artefacts";
import { modelIds, models } from "@/lib/llm";
import type { ModelId } from "@/lib/llm";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationEvent } from "./conversation-schema";
import { updateConversation } from "./update-conversation";

export function Chat({ conversation }: { conversation: Conversation }) {
  const step = useAgentRun(conversation.id);
  const running = step !== null;
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [conversation.events.length, running]);

  const send = () => {
    const message = draft.trim();
    if (!message || running) return;
    setDraft("");
    void sendUserMessage(conversation.id, message);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {conversation.events.length === 0 && (
            <div className="flex flex-col gap-2 py-6">
              <p className="text-sm text-muted-foreground">What do you want to build? Try:</p>
              {artefacts[conversation.artefactType].examples.map((example) => (
                <button
                  key={example}
                  onClick={() => void sendUserMessage(conversation.id, example)}
                  className="rounded-lg border px-3 py-2 text-left text-sm hover:border-primary hover:bg-muted/50"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
          {conversation.events.map((event) => (
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
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <NativeSelect
            size="sm"
            aria-label="Model"
            value={conversation.model}
            onChange={(event) =>
              updateConversation(conversation.id, () => ({ model: event.target.value as ModelId }))
            }
          >
            {modelIds.map((id) => (
              <option key={id} value={id}>
                {models[id].label}
              </option>
            ))}
          </NativeSelect>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Ask the agent…"
            rows={1}
            className="max-h-40 min-h-9 flex-1 resize-none"
          />
          {running ? (
            <Button type="button" variant="outline" size="icon" onClick={() => stopAgent(conversation.id)} aria-label="Stop">
              <SquareIcon />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send">
              <ArrowUpIcon />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function EventView({ event }: { event: ConversationEvent }) {
  if (event.kind === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
        {event.text}
      </div>
    );
  }
  if (event.kind === "assistant") {
    return (
      <div className="markdown max-w-[95%] text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.text}</ReactMarkdown>
      </div>
    );
  }
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
      <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
