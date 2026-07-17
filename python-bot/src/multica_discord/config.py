"""Environment configuration and validation."""

from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class BotConfig(BaseSettings):
    """Bot configuration loaded from environment variables.

    The bot fails fast at startup when any required variable is missing.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DISCORD_BOT_TOKEN: str = Field(..., description="Discord bot token")
    DISCORD_CHANNEL_ID: int = Field(..., description="Target Discord channel ID")
    MULTICA_API_BASE_URL: str = Field(..., description="Multica API base URL")
    MULTICA_API_TOKEN: str = Field(..., description="Multica API token")
    MULTICA_WORKSPACE_ID: str = Field(..., description="Multica workspace UUID")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")


__all__ = ["BotConfig", "ValidationError"]
