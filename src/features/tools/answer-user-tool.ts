import { z } from "zod";
import { defineTool } from "./tool-schema";

export const answerUserTool = defineTool({
  name: "answer_user",
  description:
    "Sends your final reply to the user and ends your turn. Call it once the request is done, to ask a clarifying question, or to explain a blocking problem.",
  input: z.object({
    message: z.string().min(1).describe("Reply shown to the user, in markdown, in the user's language"),
  }),
  async run(input) {
    return input;
  },
});
