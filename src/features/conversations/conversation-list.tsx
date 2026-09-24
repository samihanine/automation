import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { DownloadIcon, HistoryIcon, MessageSquareIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { artefacts } from "@/features/artefacts";
import { cn } from "@/lib/utils";
import { useDeleteConversation } from "./delete-conversation";
import { downloadConversation } from "./download-conversation";
import { useConversations } from "./use-conversations";

export function ConversationList({ activeId }: { activeId?: string }) {
  const [open, setOpen] = useState(false);
  const { data: conversations = [] } = useConversations();
  const deleteConversation = useDeleteConversation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <HistoryIcon />
        History
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Conversations</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {conversations.length === 0 && (
            <p className="px-3 text-sm text-muted-foreground">No conversation yet.</p>
          )}
          {conversations.map((conversation) => {
            const definition = conversation.artefact ? artefacts[conversation.artefact.type] : null;
            const Icon = definition?.icon ?? MessageSquareIcon;
            return (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted",
                  conversation.id === activeId && "bg-muted",
                )}
              >
                <Link
                  to="/agent"
                  search={{ c: conversation.id }}
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{conversation.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {definition?.label ?? "Chat"} · {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => downloadConversation(conversation)}
                  aria-label="Download conversation"
                >
                  <DownloadIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => deleteConversation.mutate(conversation.id)}
                  aria-label="Delete conversation"
                >
                  <Trash2Icon />
                </Button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
