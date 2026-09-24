import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DatabaseIcon, DownloadIcon, FileBarChartIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ArtefactPanel } from "@/features/artefacts/artefact-panel";
import { Chat } from "@/features/conversations/chat";
import { ConversationList } from "@/features/conversations/conversation-list";
import type { ConversationArtefact } from "@/features/conversations/conversation-schema";
import { createConversation } from "@/features/conversations/create-conversation";
import { downloadConversation } from "@/features/conversations/download-conversation";
import { updateConversation } from "@/features/conversations/update-conversation";
import { useConversation } from "@/features/conversations/use-conversations";
import { DatasetSelector } from "@/features/datasets/dataset-selector";
import { datasets } from "@/features/datasets/dataset-store";
import { LlmAuthError, getConversations } from "@/lib/llm";
import type { ModelId } from "@/lib/models";
import { readSettings } from "@/lib/settings";
import { sendUserMessage } from "./run-agent";

type Draft = { datasetId?: string; artefact: ConversationArtefact | null; model: ModelId };

const newDraft = (): Draft => ({ artefact: null, model: readSettings().defaultModel });

export function AgentPage({ conversationId }: { conversationId?: string }) {
  const navigate = useNavigate();
  const conversation = useConversation(conversationId);
  const { data: datasetList = [] } = datasets.useList();
  const [draft, setDraft] = useState(newDraft);
  const auth = useQuery({ queryKey: ["llm-auth"], queryFn: getConversations, retry: false, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (auth.error instanceof LlmAuthError) void navigate({ to: "/settings", search: { error: "ai-token" } });
  }, [auth.error, navigate]);

  const datasetId = conversation?.datasetId ?? draft.datasetId ?? datasetList[0]?.id;
  const dataset = datasetList.find((item) => item.id === datasetId);
  const artefact = conversation ? conversation.artefact : draft.artefact;
  const model = conversation?.model ?? draft.model;

  const update = (patch: Partial<Draft>) =>
    conversation ? updateConversation(conversation.id, () => patch) : setDraft({ ...draft, ...patch });

  const send = async (message: string, files: File[]) => {
    if (!datasetId) return;
    let id = conversation?.id;
    if (!id) {
      id = (await createConversation({ title: message.slice(0, 60), datasetId, artefact, model })).id;
      setDraft(newDraft());
      await navigate({ to: "/agent", search: { c: id } });
    }
    void sendUserMessage(id, message, files);
  };

  return (
    <div className="flex h-dvh flex-col">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="40%" minSize="25%">
          <div className="flex h-full flex-col">
            <header className="flex flex-col gap-2 border-b p-3">
              <div className="flex items-center gap-2">
                {conversation ? (
                  <Input
                    key={`${conversation.id}-${conversation.title}`}
                    defaultValue={conversation.title}
                    onBlur={(event) => {
                      const title = event.target.value.trim();
                      if (title && title !== conversation.title) updateConversation(conversation.id, () => ({ title }));
                    }}
                    className="h-8 flex-1 border-transparent font-medium shadow-none hover:border-input"
                    aria-label="Conversation title"
                  />
                ) : (
                  <span className="flex-1 px-3 text-sm font-medium">New conversation</span>
                )}
                <ConversationList activeId={conversation?.id} />
                <Button size="sm" nativeButton={false} render={<Link to="/agent" />}>
                  <PlusIcon />
                  New
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <DatasetSelector value={datasetId} onChange={(id) => update({ datasetId: id })} />
                <span className="flex-1" />
                {conversation && (
                  <Button variant="ghost" size="xs" onClick={() => downloadConversation(conversation)}>
                    <DownloadIcon />
                    Log
                  </Button>
                )}
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link to="/datasets" />}>
                  <DatabaseIcon />
                  Datasets
                </Button>
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link to="/reports" />}>
                  <FileBarChartIcon />
                  Reports
                </Button>
                <Button variant="ghost" size="icon-xs" nativeButton={false} render={<Link to="/settings" />} aria-label="Settings">
                  <SettingsIcon />
                </Button>
              </div>
            </header>
            <Chat
              conversationId={conversation?.id}
              events={conversation?.events ?? []}
              model={model}
              onModelChange={(next) => update({ model: next })}
              onSend={(message, files) => void send(message, files)}
              disabledReason={
                dataset ? undefined : datasetList.length ? "Select a dataset to start chatting." : "Add a dataset first (Datasets page)."
              }
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="60%" minSize="30%">
          <ArtefactPanel artefact={artefact} datasetId={dataset?.id} onChange={(next) => update({ artefact: next })} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
