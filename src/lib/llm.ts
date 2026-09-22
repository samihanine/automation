import { z } from "zod";
import { localCollection } from "./local-storage";
import { defaultModel } from "./models";
import type { ModelId } from "./models";
import { readSettings } from "./settings";

export * from "./models";

const llmConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
});

const llmMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  textContent: z.string(),
  model: z.string().optional(),
  createdAt: z.string(),
});

export type LlmConversation = z.infer<typeof llmConversationSchema>;
export type LlmMessage = z.infer<typeof llmMessageSchema>;

const conversations = localCollection("llm:conversations", llmConversationSchema);
const messages = localCollection("llm:messages", llmMessageSchema);

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function createConversation(
  title: string,
  conversationId: string = crypto.randomUUID(),
) {
  const { id } = conversations.save({
    id: conversationId,
    title,
    createdAt: new Date().toISOString(),
  });
  return { id, title };
}

export async function getConversations() {
  return conversations.list().map(({ id, title }) => ({ id, title }));
}

export async function deleteConversation(conversationId: string) {
  conversations.remove(conversationId);
  for (const message of await getConversationMessages(conversationId)) {
    messages.remove(message.id);
  }
}

export async function getConversationMessages(conversationId: string) {
  return messages
    .list()
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getLastMessage(conversationId: string) {
  return (await getConversationMessages(conversationId)).at(-1);
}

export async function createMessage(
  textContent: string,
  conversationId: string,
  model: ModelId = defaultModel,
  signal?: AbortSignal,
) {
  const message = saveMessage(conversationId, "user", textContent, model);
  const history = await getConversationMessages(conversationId);
  const reply = await complete(
    model,
    history.map(({ role, textContent: content }) => ({ role, content })),
    signal,
  );
  saveMessage(conversationId, "assistant", reply, model);
  return message;
}

function saveMessage(
  conversationId: string,
  role: LlmMessage["role"],
  textContent: string,
  model: string,
) {
  return messages.save({
    id: crypto.randomUUID(),
    conversationId,
    role,
    textContent,
    model,
    createdAt: new Date().toISOString(),
  });
}

async function complete(
  model: ModelId,
  history: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
  attempt = 0,
): Promise<string> {
  const { aiToken } = readSettings();
  if (!aiToken) throw new Error("Missing AI token. Add it in Settings.");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${aiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages: history }),
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    return complete(model, history, signal, attempt + 1);
  }

  const body = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? `AI request failed (${response.status})`);
  }
  return body.choices?.[0]?.message?.content ?? "";
}
