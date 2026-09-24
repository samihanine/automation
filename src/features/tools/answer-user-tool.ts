import { z } from "zod";
import { defineTool } from "./tool-schema";

export const answerUserTool = defineTool({
  name: "answer_user",
  description:
    "Sends your final reply to the user and ends your turn. Call it once the request is done, to ask a clarifying question, or to explain a blocking problem. \"message\" is rendered as HTML (markdown is also accepted).",
  input: z.object({
    message: z
      .string()
      .min(1)
      .describe("Reply in the user's language. HTML: <b>, <i>, <p>, <ul><li>, <table>, <span style=\"color:…\">…"),
  }),
  async run(input) {
    return input;
  },
});
