"""Discord bot implementation."""

from __future__ import annotations

import logging
from typing import Any

import discord

from multica_discord.config import BotConfig
from multica_discord.multica_client import MulticaClient, MulticaError
from multica_discord.parser import CommandParser, ParsedCommand, ValidationError

logger = logging.getLogger(__name__)


HELP_MESSAGE = """\
Available commands:
- `!issue <id>` — look up an issue
- `!comment <issue-id> <text>` — add a comment
- `!create <title> [--description ...] [--priority high|medium|low]` — create an issue
- `!assign <issue-id> <assignee-id>` — assign an issue
- `!status <issue-id> <status>` — update status

Messages outside this channel are ignored."""


class QuestionHandler:
    """Answer generic questions from Discord users.

    This is a replaceable component so tests can inject a fixed responder.
    """

    async def answer(self, _text: str) -> str:
        """Return a help message for a question."""
        return HELP_MESSAGE


class MulticaDiscordBot(discord.Client):
    """Discord bot that routes commands to a replaceable Multica client.

    The bot ignores messages from itself, other bots, and any channel other than
    the configured ``DISCORD_CHANNEL_ID``.
    """

    def __init__(
        self,
        config: BotConfig,
        multica_client: MulticaClient,
        question_handler: QuestionHandler | None = None,
    ) -> None:
        """Initialize the bot.

        Args:
            config: Validated bot configuration.
            multica_client: Multica API client (may be a fake in tests).
            question_handler: Optional question responder.
        """
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(intents=intents)
        self._config = config
        self._multica = multica_client
        self._question_handler = question_handler or QuestionHandler()

    async def on_ready(self) -> None:
        """Log connection event."""
        logger.info("Discord bot logged in as %s", self.user)

    async def on_message(self, message: discord.Message) -> None:
        """Handle an incoming Discord message."""
        if message.author.bot:
            return
        if message.channel.id != self._config.DISCORD_CHANNEL_ID:
            logger.debug("Ignoring message in channel %s", message.channel.id)
            return

        try:
            command = CommandParser.parse(message.content)
        except ValidationError as exc:
            await message.reply(f"Invalid input: {exc}")
            return

        try:
            response = await self._dispatch(command)
        except MulticaError as exc:
            logger.warning("Multica action failed: %s", exc)
            await message.reply(f"Upstream error: {exc}")
            return

        await message.reply(response)

    async def _dispatch(self, command: ParsedCommand) -> str:
        """Execute a parsed command and return a Discord reply string."""
        if command.name == "question":
            return await self._question_handler.answer(command.args["text"])

        if command.name == "issue":
            issue = await self._multica.get_issue(command.args["issue_id"])
            return format_issue(issue)

        if command.name == "comment":
            await self._multica.add_comment(command.args["issue_id"], command.args["content"])
            return "Comment added."

        if command.name == "create":
            issue = await self._multica.create_issue(
                title=command.args["title"],
                description=command.args.get("description"),
                priority=command.args.get("priority"),
                assignee_id=command.args.get("assignee_id"),
            )
            return f"Issue created: {format_issue_summary(issue)}"

        if command.name == "assign":
            await self._multica.assign_issue(command.args["issue_id"], command.args["assignee_id"])
            return "Issue assigned."

        if command.name == "status":
            await self._multica.update_status(command.args["issue_id"], command.args["status"])
            return "Status updated."

        raise ValidationError(f"Unsupported command: {command.name}")


async def run_bot(config: BotConfig) -> None:
    """Run the bot with the given configuration."""
    multica_client = MulticaClient(
        base_url=config.MULTICA_API_BASE_URL,
        api_token=config.MULTICA_API_TOKEN,
        workspace_id=config.MULTICA_WORKSPACE_ID,
    )
    try:
        bot = MulticaDiscordBot(config=config, multica_client=multica_client)
        await bot.start(config.DISCORD_BOT_TOKEN)
    finally:
        await multica_client.close()


def format_issue(issue: dict[str, Any]) -> str:
    """Format an issue API response for Discord."""
    title = issue.get("title", "Untitled")
    status = issue.get("status", "unknown")
    identifier = issue.get("identifier", issue.get("id", "unknown"))
    description = issue.get("description", "").strip()
    lines = [f"**{identifier}**: {title}", f"Status: `{status}`"]
    if description:
        lines.append("")
        lines.append(description[:500])
    return "\n".join(lines)


def format_issue_summary(issue: dict[str, Any]) -> str:
    """Return a short summary of an issue."""
    identifier = issue.get("identifier", issue.get("id", "unknown"))
    title = issue.get("title", "Untitled")
    return f"**{identifier}**: {title}"


__all__ = [
    "MulticaDiscordBot",
    "QuestionHandler",
    "run_bot",
    "format_issue",
    "format_issue_summary",
]
