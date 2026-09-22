import { localCollection } from "@/lib/local-storage";
import { conversationSchema } from "./conversation-schema";

export const conversationStore = localCollection("conversations", conversationSchema);
