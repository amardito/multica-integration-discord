import pytest
from pydantic import ValidationError

from multica_discord.config import BotConfig


def test_config_requires_mandatory_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in [
        "DISCORD_BOT_TOKEN",
        "DISCORD_CHANNEL_ID",
        "MULTICA_API_BASE_URL",
        "MULTICA_API_TOKEN",
        "MULTICA_WORKSPACE_ID",
    ]:
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(ValidationError):
        BotConfig()


def test_config_parses_channel_id(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DISCORD_BOT_TOKEN", "token")
    monkeypatch.setenv("DISCORD_CHANNEL_ID", "123456789")
    monkeypatch.setenv("MULTICA_API_BASE_URL", "http://example.test")
    monkeypatch.setenv("MULTICA_API_TOKEN", "secret")
    monkeypatch.setenv("MULTICA_WORKSPACE_ID", "workspace-1")

    config = BotConfig()

    assert config.DISCORD_CHANNEL_ID == 123456789
