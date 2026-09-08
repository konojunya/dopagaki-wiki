import { z } from "zod";
import { storySchema } from "../src/schema.js";
import { json } from "../src/common.js";
await json(
  "schemas/story.schema.json",
  z.toJSONSchema(storySchema, { io: "input" }),
);
