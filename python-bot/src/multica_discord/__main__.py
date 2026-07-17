"""Bot entry point."""

import asyncio
import logging

from multica_discord.bot import run_bot
from multica_discord.config import BotConfig


def main() -> None:
    """Run the bot."""
    config = BotConfig()
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    asyncio.run(run_bot(config))


if __name__ == "__main__":
    main()
