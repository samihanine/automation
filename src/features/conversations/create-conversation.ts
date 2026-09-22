import { artefacts } from "@/features/artefacts";
import type { ArtefactType } from "@/features/artefacts";
import { workspaceStore } from "@/features/workspaces/workspace-store";
import * as llm from "@/lib/llm";
import type { ModelId } from "@/lib/llm";
import { queryClient } from "@/lib/query-client";
import { conversationStore } from "./conversation-store";
import { conversationsQueryKey } from "./use-conversations";

export async function createConversation(input: {
  workspaceId: string;
  artefactType: ArtefactType;
  model: ModelId;
}) {
  const workspace = workspaceStore.get(input.workspaceId);
  if (!workspace) throw new Error("Workspace not found");
  const artefact = artefacts[input.artefactType];
  const title = `${artefact.label} · ${workspace.title}`;
  const { id } = await llm.createConversation(title);
  const now = new Date().toISOString();
  const conversation = conversationStore.save({
    id,
    title,
    ...input,
    artefact: artefact.initial(workspace),
    events: [],
    createdAt: now,
    updatedAt: now,
  });
  await queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
  return conversation;
}
