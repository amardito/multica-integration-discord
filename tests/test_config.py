import os

import pytest
from pydantic import ValidationError

from src.multica_discord.config import Config


def _set_env(**kwargs: str) -> None:
    for k, v in kwargs.items():
        os.environ[k] = v
    os.environ.pop(".env", None)


def _clear_env(*keys: str) -> None:
    for k in keys:
        os.environ.pop(k, None)


def test_config_missing_discord_token() -> None:
    _set_env(
        MULTICA_API_URL="https://api.example.com",
        MULTICA_API_TOKEN="token123",
        DISCORD_CHANNEL_ID="555",
    )
    try:
        with pytest.raises(ValidationError):
            Config()
    finally:
        _clear_env("MULTICA_API_URL", "MULTICA_API_TOKEN", "DISCORD_CHANNEL_ID")


def test_config_missing_api_url() -> None:
    _set_env(
        DISCORD_BOT_TOKEN="token",
        MULTICA_API_TOKEN="token123",
        DISCORD_CHANNEL_ID="555",
    )
    try:
        with pytest.raises(ValidationError):
            Config()
    finally:
        _clear_env("DISCORD_BOT_TOKEN", "MULTICA_API_TOKEN", "DISCORD_CHANNEL_ID")


def test_config_missing_api_token() -> None:
    _set_env(
        DISCORD_BOT_TOKEN="token",
        MULTICA_API_URL="https://api.example.com",
        DISCORD_CHANNEL_ID="555",
    )
    try:
        with pytest.raises(ValidationError):
            Config()
    finally:
        _clear_env("DISCORD_BOT_TOKEN", "MULTICA_API_URL", "DISCORD_CHANNEL_ID")


def test_config_missing_channel_id() -> None:
    _set_env(
        DISCORD_BOT_TOKEN="token",
        MULTICA_API_URL="https://api.example.com",
        MULTICA_API_TOKEN="token123",
    )
    try:
        with pytest.raises(ValidationError):
            Config()
    finally:
        _clear_env("DISCORD_BOT_TOKEN", "MULTICA_API_URL", "MULTICA_API_TOKEN")


def test_config_all_required_present() -> None:
    _set_env(
        DISCORD_BOT_TOKEN="token",
        MULTICA_API_URL="https://api.example.com",
        MULTICA_API_TOKEN="token123",
        DISCORD_CHANNEL_ID="555",
    )
    try:
        cfg = Config()
        assert cfg.discord_bot_token == "token"
        assert cfg.multica_api_url == "https://api.example.com"
        assert cfg.multica_api_token == "token123"
        assert cfg.discord_channel_id == "555"
    finally:
        _clear_env(
            "DISCORD_BOT_TOKEN",
            "MULTICA_API_URL",
            "MULTICA_API_TOKEN",
            "DISCORD_CHANNEL_ID",
        )
