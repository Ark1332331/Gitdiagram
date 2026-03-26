import OpenAI from "openai";

export type ReasoningEffort = "low" | "medium" | "high";

function resolveBaseURL(): string | undefined {
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  return baseURL ? baseURL.replace(/\/$/, "") : undefined;
}

function formatOpenAIError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "OpenAI request failed.";
  }

  const name =
    "name" in error && typeof error.name === "string" ? error.name : undefined;

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "OpenAI request failed.";

  const status =
    "status" in error &&
    (typeof error.status === "number" || typeof error.status === "string")
      ? String(error.status)
      : undefined;

  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;

  const type =
    "type" in error && typeof error.type === "string" ? error.type : undefined;

  const cause =
    "cause" in error && error.cause && typeof error.cause === "object"
      ? (error.cause as Record<string, unknown>)
      : undefined;

  const causeCode =
    cause && typeof cause.code === "string" ? cause.code : undefined;

  const causeMessage =
    cause && typeof cause.message === "string" ? cause.message : undefined;

  const parts = [
    message,
    name ? `name=${name}` : undefined,
    status ? `status=${status}` : undefined,
    code ? `code=${code}` : undefined,
    type ? `type=${type}` : undefined,
    causeCode ? `cause.code=${causeCode}` : undefined,
    causeMessage ? `cause.message=${causeMessage}` : undefined,
  ].filter(Boolean);

  return parts.join(" ");
}

function createClient(overrideApiKey?: string): OpenAI {
  return new OpenAI({
    apiKey: resolveApiKey(overrideApiKey),
    baseURL: resolveBaseURL(),
    timeout: 10 * 60 * 1000,
    maxRetries: 2,
  });
}

function resolveApiKey(overrideApiKey?: string): string {
  const apiKey = overrideApiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing OpenAI API key. Set OPENAI_API_KEY or provide api_key in request.",
    );
  }
  return apiKey;
}

export function estimateTokens(text: string): number {
  // Rough heuristic used for fast gating/cost estimates in serverless.
  return Math.ceil(text.length / 4);
}

interface StreamCompletionParams {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  apiKey?: string;
  reasoningEffort?: ReasoningEffort;
  maxOutputTokens?: number;
}

export async function* streamCompletion({
  model,
  systemPrompt,
  userPrompt,
  apiKey,
  // NOTE: reasoningEffort is specific to OpenAI Responses API. We intentionally
  // ignore it here to support OpenAI-compatible providers (e.g. DeepSeek) via
  // the Chat Completions API.
  reasoningEffort: _reasoningEffort,
  maxOutputTokens,
}: StreamCompletionParams): AsyncGenerator<string, void, void> {
  try {
    const client = createClient(apiKey);
    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
    });

    for await (const event of stream) {
      const delta = event.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) {
        yield delta;
      }
    }
  } catch (error) {
    throw new Error(formatOpenAIError(error));
  }
}

interface CountInputTokensParams {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  apiKey?: string;
  reasoningEffort?: ReasoningEffort;
}

export async function countInputTokens({
  model,
  systemPrompt,
  userPrompt,
  apiKey,
  reasoningEffort,
}: CountInputTokensParams): Promise<number> {
  // Token counting is not universally supported by OpenAI-compatible providers.
  // Only attempt it when using the default OpenAI base URL.
  const baseURL = resolveBaseURL();
  if (baseURL && !/openai\.com/i.test(baseURL)) {
    throw new Error("Token counting unsupported for custom OPENAI_BASE_URL.");
  }

  const client = createClient(apiKey);
  const response = await client.responses.inputTokens.count({
    model,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
  });

  return response.input_tokens;
}
