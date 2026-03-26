from __future__ import annotations

from typing import AsyncGenerator, Literal
import math
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

from app.utils.format_message import format_user_message

load_dotenv()

ReasoningEffort = Literal["low", "medium", "high"]


class OpenAIService:
    def __init__(self):
        self.default_api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = (os.getenv("OPENAI_BASE_URL") or "").strip() or None

    def _resolve_api_key(self, override_api_key: str | None = None) -> str:
        api_key = (override_api_key or self.default_api_key or "").strip()
        if not api_key:
            raise ValueError(
                "Missing OpenAI API key. Set OPENAI_API_KEY or provide api_key in request."
            )
        return api_key

    @staticmethod
    def estimate_tokens(text: str) -> int:
        # Mirrors Next.js fallback heuristic.
        return math.ceil(len(text) / 4)

    @staticmethod
    def _build_input(system_prompt: str, user_prompt: str) -> list[dict]:
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    @staticmethod
    def _create_client(api_key: str, base_url: str | None) -> AsyncOpenAI:
        # Keep explicit config local to this service.
        kwargs: dict = {
            "api_key": api_key,
            "max_retries": 2,
            "timeout": 600,
        }
        if base_url:
            kwargs["base_url"] = base_url.rstrip("/")
        return AsyncOpenAI(**kwargs)

    async def stream_completion(
        self,
        *,
        model: str,
        system_prompt: str,
        data: dict[str, str | None],
        api_key: str | None = None,
        reasoning_effort: ReasoningEffort | None = None,
        max_output_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        user_prompt = format_user_message(data)
        resolved_api_key = self._resolve_api_key(api_key)
        payload: dict = {
            "model": model,
            "stream": True,
            "messages": self._build_input(system_prompt, user_prompt),
        }
        # NOTE: reasoning_effort is specific to OpenAI Responses API. We use Chat
        # Completions for broader compatibility (e.g. DeepSeek base_url).
        if max_output_tokens:
            payload["max_tokens"] = max_output_tokens

        client = self._create_client(resolved_api_key, self.base_url)
        stream = await client.chat.completions.create(**payload)
        try:
            async for event in stream:
                # OpenAI-compatible streaming chunks
                choices = getattr(event, "choices", None)
                if not choices:
                    continue
                delta = getattr(choices[0], "delta", None)
                content = getattr(delta, "content", None) if delta else None
                if isinstance(content, str) and content:
                    yield content
        finally:
            await stream.close()
            await client.close()

    async def count_input_tokens(
        self,
        *,
        model: str,
        system_prompt: str,
        data: dict[str, str | None],
        api_key: str | None = None,
        reasoning_effort: ReasoningEffort | None = None,
    ) -> int:
        user_prompt = format_user_message(data)
        resolved_api_key = self._resolve_api_key(api_key)
        payload: dict = {
            "model": model,
            "input": self._build_input(system_prompt, user_prompt),
        }
        if reasoning_effort:
            payload["reasoning"] = {"effort": reasoning_effort}

        # Token counting is not universally supported across OpenAI-compatible providers.
        if self.base_url and "openai.com" not in self.base_url:
            raise ValueError("Token counting unsupported for custom OPENAI_BASE_URL.")

        client = self._create_client(resolved_api_key, self.base_url)
        try:
            response = await client.responses.input_tokens.count(**payload)
            input_tokens = getattr(response, "input_tokens", None)
            if not isinstance(input_tokens, int):
                raise ValueError("OpenAI input token count returned invalid payload.")
            return input_tokens
        finally:
            await client.close()
