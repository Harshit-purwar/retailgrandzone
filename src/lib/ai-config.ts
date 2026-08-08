/**
 * OpenAI-compatible AI configuration.
 * Reads from the environment; the API key is never exposed to the client.
 */

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function aiConfig(): AiConfig {
  const baseUrl = (import.meta.env.VITE_AI_BASE_URL || process.env.AI_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const apiKey = (process.env.AI_API_KEY || "").trim();
  const model =
    (import.meta.env.VITE_AI_MODEL || process.env.AI_MODEL || "").trim() || "gpt-4o-mini";

  if (!baseUrl) {
    throw new Error(
      "AI is not configured: the server environment variable VITE_AI_BASE_URL (or AI_BASE_URL) is missing. Add it to the deployment environment and redeploy.",
    );
  }
  if (!apiKey) {
    throw new Error(
      "AI is not configured: the server environment variable AI_API_KEY is missing. Add it to the deployment environment and redeploy.",
    );
  }

  return { baseUrl, apiKey, model };
}

/** POSTs an OpenAI-compatible chat completion request. */
export async function postChatCompletion(params: {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
}): Promise<Response> {
  const { baseUrl, apiKey, model } = aiConfig();
  const { messages, stream } = params;
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: params.model || model, messages, stream }),
  });
}
