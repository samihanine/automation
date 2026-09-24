import { z } from "zod";
import { localCollection } from "./local-storage";
import { defaultModel } from "./models";
import type { ModelId } from "./models";
import { blobToDataUrl, deleteFile, readFile, saveFile } from "./file-store";
import { readSettings } from "./settings";
import { xlsxToText } from "./xlsx";

export * from "./models";

const llmConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  fileIds: z.array(z.string()).default([]),
  createdAt: z.string(),
});

const llmMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  textContent: z.string(),
  fileId: z.string().optional(),
  model: z.string().optional(),
  createdAt: z.string(),
});

export type LlmConversation = z.infer<typeof llmConversationSchema>;
export type LlmMessage = z.infer<typeof llmMessageSchema>;

const conversations = localCollection("llm:conversations", llmConversationSchema);
const messages = localCollection("llm:messages", llmMessageSchema);

const OPENAI_URL = "https://api.openai.com/v1";

export class LlmAuthError extends Error {
  constructor(readonly status: number) {
    super(status === 0 ? "Missing AI token." : `The AI token was rejected (HTTP ${status}).`);
    this.name = "LlmAuthError";
  }
}

export async function createConversation(
  title: string,
  conversationId: string = crypto.randomUUID(),
) {
  const { id } = conversations.save({
    id: conversationId,
    title,
    fileIds: [],
    createdAt: new Date().toISOString(),
  });
  return { id, title };
}

export async function getConversations() {
  const { aiToken } = readSettings();
  if (!aiToken) throw new LlmAuthError(0);
  const response = await fetch(`${OPENAI_URL}/models`, { headers: { Authorization: `Bearer ${aiToken}` } });
  if (!response.ok) throw new LlmAuthError(response.status);
  return conversations.list().map(({ id, title }) => ({ id, title }));
}

export async function deleteConversation(conversationId: string) {
  for (const fileId of conversations.get(conversationId)?.fileIds ?? []) await deleteFile(fileId);
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

export type CreateMessageOptions = { signal?: AbortSignal; json?: boolean };

export async function createMessage(
  textContent: string,
  conversationId: string,
  model: ModelId = defaultModel,
  options: CreateMessageOptions = {},
) {
  const message = saveMessage({ conversationId, role: "user", textContent, model });
  const history = await getConversationMessages(conversationId);
  const reply = await complete(model, await Promise.all(history.map(toOpenAiMessage)), options);
  saveMessage({ conversationId, role: "assistant", textContent: reply, model });
  return message;
}

export async function uploadFile(file: File, conversationId: string) {
  const stored = await saveFile(file);
  const conversation = conversations.get(conversationId);
  if (conversation) conversations.save({ ...conversation, fileIds: [...conversation.fileIds, stored.id] });
  return saveMessage({ conversationId, role: "user", textContent: `[file] ${file.name}`, fileId: stored.id });
}

export const getFile = readFile;

function saveMessage(message: Pick<LlmMessage, "conversationId" | "role" | "textContent" | "fileId" | "model">) {
  return messages.save({ ...message, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

const TEXT_TYPES = /^(text\/|application\/(json|xml|csv|x-ndjson))|\.(md|mdx|csv|txt|json|dax|sql|xml|tsv)$/i;
const XLSX_TYPES = /spreadsheetml|\.xlsx$/i;
const MAX_TEXT = 60000;

async function fileContent(fileId: string): Promise<ContentPart[]> {
  const file = await readFile(fileId);
  if (!file) return [{ type: "text", text: "[attached file no longer available]" }];
  const header = { type: "text" as const, text: `Attached file "${file.name}" (${file.type || "unknown type"}, ${file.size} bytes):` };
  if (file.type.startsWith("image/")) {
    return [header, { type: "image_url", image_url: { url: await blobToDataUrl(file.blob) } }];
  }
  if (file.type === "application/pdf") {
    return [header, { type: "file", file: { filename: file.name, file_data: await blobToDataUrl(file.blob) } }];
  }
  const text = XLSX_TYPES.test(file.type) || XLSX_TYPES.test(file.name)
    ? await xlsxToText(file.blob)
    : TEXT_TYPES.test(file.type) || TEXT_TYPES.test(file.name)
      ? await file.blob.text()
      : "[binary content that cannot be read as text]";
  return [header, { type: "text", text: text.slice(0, MAX_TEXT) }];
}

async function toOpenAiMessage(message: LlmMessage) {
  return {
    role: message.role,
    content: message.fileId ? await fileContent(message.fileId) : message.textContent,
  };
}

async function complete(
  model: ModelId,
  history: Array<{ role: string; content: string | ContentPart[] }>,
  options: CreateMessageOptions,
  attempt = 0,
): Promise<string> {
  const { aiToken } = readSettings();
  if (!aiToken) throw new LlmAuthError(0);

  const response = await fetch(`${OPENAI_URL}/chat/completions`, {
    method: "POST",
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${aiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: history,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    return complete(model, history, options, attempt + 1);
  }

  const body = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (response.status === 401 || response.status === 403) throw new LlmAuthError(response.status);
  if (!response.ok) {
    throw new Error(body.error?.message ?? `AI request failed (${response.status})`);
  }
  return body.choices?.[0]?.message?.content ?? "";
}
