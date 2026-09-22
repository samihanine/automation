import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { DownloadIcon, PlusIcon, SettingsIcon, Settings2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { artefacts } from "@/features/artefacts";
import { ArtefactPanel } from "@/features/artefacts/artefact-panel";
import { Chat } from "@/features/conversations/chat";
import { ConversationList } from "@/features/conversations/conversation-list";
import { CreateConversationPage } from "@/features/conversations/create-conversation-page";
import { downloadConversation } from "@/features/conversations/download-conversation";
import { updateConversation } from "@/features/conversations/update-conversation";
import { useConversation } from "@/features/conversations/use-conversations";
import { useWorkspace } from "@/features/workspaces/get-workspaces";

export function AgentPage({ conversationId }: { conversationId?: string }) {
  const conversation = useConversation(conversationId);
  const workspace = useWorkspace(conversation?.workspaceId);
  const [creating, setCreating] = useState(false);

  const newConversation = (
    <Button size="sm" onClick={() => setCreating(true)}>
      <PlusIcon />
      New
    </Button>
  );

  return (
    <div className="flex h-dvh flex-col">
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">New conversation</DialogTitle>
          <CreateConversationPage onCreated={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      {!conversation || !workspace ? (
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4">
            <span className="font-semibold">Agent</span>
            <div className="flex gap-2">
              <ConversationList />
              <NavLinks />
            </div>
          </header>
          <main className="flex flex-1 items-center overflow-auto p-6">
            <CreateConversationPage />
          </main>
        </div>
      ) : (
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="40%" minSize="25%">
            <div className="flex h-full flex-col">
              <header className="flex flex-col gap-2 border-b p-3">
                <div className="flex items-center gap-2">
                  <Input
                    key={`${conversation.id}-${conversation.title}`}
                    defaultValue={conversation.title}
                    onBlur={(event) => {
                      const title = event.target.value.trim();
                      if (title && title !== conversation.title) {
                        updateConversation(conversation.id, () => ({ title }));
                      }
                    }}
                    className="h-8 flex-1 border-transparent font-medium shadow-none hover:border-input"
                    aria-label="Conversation title"
                  />
                  <ConversationList activeId={conversation.id} />
                  {newConversation}
                </div>
                <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  <span className="min-w-0 flex-1 truncate">
                    Workspace · <span className="text-foreground">{workspace.title}</span>
                  </span>
                  <Button variant="ghost" size="xs" onClick={() => downloadConversation(conversation)}>
                    <DownloadIcon />
                    Log
                  </Button>
                  <Button variant="ghost" size="xs" nativeButton={false} render={<Link to="/workspaces" />}>
                    <Settings2Icon />
                    Manage workspaces
                  </Button>
                  <Button variant="ghost" size="icon-xs" nativeButton={false} render={<Link to="/settings" />} aria-label="Settings">
                    <SettingsIcon />
                  </Button>
                </div>
              </header>
              <Chat conversation={conversation} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="60%" minSize="30%">
            <ArtefactPanel
              artefact={artefacts[conversation.artefactType]}
              value={conversation.artefact}
              workspace={workspace}
              onChange={(artefact) => updateConversation(conversation.id, () => ({ artefact }))}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}

function NavLinks() {
  return (
    <>
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/workspaces" />}>
        <Settings2Icon />
        Workspaces
      </Button>
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/settings" />}>
        <SettingsIcon />
        Settings
      </Button>
    </>
  );
}
