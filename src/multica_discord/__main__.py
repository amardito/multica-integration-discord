import asyncio
import logging
import sys

from .bot import get_bot
from .config import Config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    try:
        config = Config()
    except Exception as exc:
        logger.error("failed to load config: %s", exc)
        sys.exit(1)

    logger.info("starting bot, channel: %s", config.discord_channel_id)
    bot = get_bot(config)
    asyncio.run(bot.start(config.discord_bot_token))


if __name__ == "__main__":
    main()
