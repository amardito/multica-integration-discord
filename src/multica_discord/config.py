from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    discord_bot_token: str
    multica_api_url: str
    multica_api_token: str
    discord_channel_id: str
