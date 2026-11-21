import { llmsTxtResponse } from "../../lib/llmsTxt";

export const dynamic = "force-static";

export function GET(): Response {
  return llmsTxtResponse();
}
