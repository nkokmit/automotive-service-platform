"""Shared LLM factory utilities with multi-model fallback support."""
from __future__ import annotations
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.config import get_settings

settings = get_settings()


def _build_gemini_candidates(
    api_key: str,
    candidate_models: list[str],
    temperature: float,
    tools: list[Any] | None = None,
) -> list[Any]:
    """Build a deduplicated list of Gemini chat models, optionally bound to tools."""
    unique_models = list(dict.fromkeys(candidate_models))
    llms = [
        ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=temperature,
            max_retries=2,
        )
        for model_name in unique_models
    ]
    if tools:
        return [llm.bind_tools(tools) for llm in llms]
    return llms


def create_llm_with_tools(tools: list[Any], temperature: float = 0.1) -> Any:
    """Instantiate Gemini (with multi-model fallbacks) or OpenAI bound to the given tools."""
    gemini_key = (
        settings.gemini_api_key.get_secret_value().strip()
        if settings.gemini_api_key
        else ""
    )
    if gemini_key:
        candidate_models = [
            settings.gemini_model,
            "gemini-3-flash-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-flash-lite-latest",
            "gemini-flash-latest",
        ]
        bound_llms = _build_gemini_candidates(
            gemini_key, candidate_models, temperature=temperature, tools=tools
        )
        primary = bound_llms[0]
        return primary.with_fallbacks(bound_llms[1:]) if len(bound_llms) > 1 else primary

    openai_key = (
        settings.openai_api_key.get_secret_value().strip()
        if settings.openai_api_key
        else ""
    )
    llm = ChatOpenAI(
        model=settings.openai_model,
        api_key=openai_key,
        temperature=temperature,
    )
    return llm.bind_tools(tools) if tools else llm


def create_router_llm() -> Any:
    """Instantiate a fast, low-temperature LLM for intent routing."""
    gemini_key = (
        settings.gemini_api_key.get_secret_value().strip()
        if settings.gemini_api_key
        else ""
    )
    if gemini_key:
        candidate_models = [
            "gemini-flash-lite-latest",
            "gemini-3.1-flash-lite-preview",
            settings.gemini_model,
            "gemini-flash-latest",
        ]
        llms = _build_gemini_candidates(gemini_key, candidate_models, temperature=0.0)
        primary = llms[0]
        return primary.with_fallbacks(llms[1:]) if len(llms) > 1 else primary

    openai_key = (
        settings.openai_api_key.get_secret_value().strip()
        if settings.openai_api_key
        else ""
    )
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=openai_key,
        temperature=0.0,
    )
