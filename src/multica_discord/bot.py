import logging

import discord
from discord.ext import commands

from .config import Config
from .multica_client import MulticaClient, MulticaClientProtocol
from .validation import (
    validate_assignee,
    validate_issue_id,
    validate_non_empty,
    validate_status,
)

logger = logging.getLogger(__name__)

COMMAND_PREFIX = "!"
HELP_TEXT = """
**Multica Discord Bot — Available Commands** (prefix: `!`)

`!multica issue <uuid>` — Look up an issue by ID
`!multica create <title>` — Create a new issue
  Optional: `desc:<description>` `priority:<priority>`
`!multica comment <issue-id> <text>` — Add a comment to an issue
`!multica assign <issue-id> <assignee-id>` — Assign an issue
`!multica status <issue-id> <status>` — Update issue status

**Examples:**
`!multica issue 550e8400-e29b-41d4-a716-446655440000`
`!multica create "Fix login" priority:high`
`!multica status 550e8400-e29b-41d4-a716-446655440000 in_progress`
"""


class MulticaBot(commands.Bot):
    def __init__(self, config: Config, multica_client: MulticaClientProtocol | None = None) -> None:
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix=COMMAND_PREFIX, intents=intents)

        self.config = config
        self.multica = multica_client or MulticaClient(
            base_url=config.multica_api_url, token=config.multica_api_token
        )
        self._bot_name = "multica-discord"

    async def on_ready(self) -> None:
        logger.info("bot ready: %s (%s)", self.user, self.user.id if self.user else None)

    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot:
            return

        if str(message.channel.id) != self.config.discord_channel_id:
            return

        await self.process_commands(message)

    async def on_command_error(self, ctx: commands.Context, error: commands.CommandError) -> None:
        if isinstance(error, commands.CommandNotFound):
            await ctx.send(f"Unknown command. Try `!help` for available commands.\n{HELP_TEXT}")
            return
        logger.error("command error: %s", error)
        await ctx.send(f"Error: {error}")


bot_instance: MulticaBot | None = None


def get_bot(config: Config, multica_client: MulticaClientProtocol | None = None) -> MulticaBot:
    global bot_instance
    if bot_instance is None:
        bot_instance = MulticaBot(config, multica_client)
        _register_commands(bot_instance)
    return bot_instance


def _register_commands(bot: MulticaBot) -> None:
    @bot.command(name="issue")
    async def issue(ctx: commands.Context, *, issue_id: str) -> None:
        try:
            issue_id = validate_issue_id(issue_id)
        except ValueError as exc:
            await ctx.send(str(exc))
            return
        try:
            result = await bot.multica.get_issue(issue_id)
        except Exception as exc:
            await ctx.send(f"Failed to retrieve issue: {exc}")
            return
        await ctx.send(f"Issue `{issue_id}`:\n```json\n{_format_json(result)}\n```")

    @bot.command(name="create")
    async def create(ctx: commands.Context, *, args: str) -> None:
        parts = args.split("desc:", 1)
        title_and_prio = parts[0].strip()
        description = parts[1].strip() if len(parts) > 1 else None

        priority: str | None = None
        title_parts = title_and_prio.split("priority:", 1)
        title = title_parts[0].strip().strip('"')
        if len(title_parts) > 1:
            priority = title_parts[1].strip()

        try:
            title = validate_non_empty(title, label="title")
        except ValueError as exc:
            await ctx.send(str(exc))
            return
        try:
            result = await bot.multica.create_issue(title, description, priority)
        except Exception as exc:
            await ctx.send(f"Failed to create issue: {exc}")
            return
        issue_id = result.get("id", "unknown")
        await ctx.send(f"Issue created: `{issue_id}`\n```json\n{_format_json(result)}\n```")

    @bot.command(name="comment")
    async def comment(ctx: commands.Context, *, args: str) -> None:
        parts = args.split(" ", 1)
        if len(parts) < 2:
            await ctx.send("Usage: `!comment <issue-id> <text>`")
            return
        issue_id, text = parts
        try:
            issue_id = validate_issue_id(issue_id)
        except ValueError as exc:
            await ctx.send(str(exc))
            return
        try:
            text = validate_non_empty(text, label="comment text")
        except ValueError as exc:
            await ctx.send(str(exc))
            return
        try:
            await bot.multica.add_comment(issue_id, text)
        except Exception as exc:
            await ctx.send(f"Failed to add comment: {exc}")
            return
        await ctx.send(f"Comment added to `{issue_id}`.")

    @bot.command(name="assign")
    async def assign(ctx: commands.Context, *, args: str) -> None:
        parts = args.split()
        if len(parts) < 2:
            await ctx.send("Usage: `!assign <issue-id> <assignee-id>`")
            return
        issue_id, assignee_id = parts[0], parts[1]
        try:
            issue_id = validate_issue_id(issue_id)
            assignee_id = validate_assignee(assignee_id)
        except ValueError as exc:
            await ctx.send(str(exc))
            return
        try:
            await bot.multica.assign_issue(issue_id, assignee_id)
        except Exception as exc:
            await ctx.send(f"Failed to assign issue: {exc}")
            return
        await ctx.send(f"Issue `{issue_id}` assigned to `{assignee_id}`.")

    @bot.command(name="status")
    async def status(ctx: commands.Context, *, args: str) -> None:
        parts = args.split()
        if len(parts) < 2:
            await ctx.send("Usage: `!status <issue-id> <status>`")
            return
        issue_id, status_val = parts[0], parts[1]
        try:
            issue_id = validate_issue_id(issue_id)
            status_val = validate_status(status_val)
        except ValueError as exc:
            await ctx.send(str(exc))
            return
        try:
            await bot.multica.update_status(issue_id, status_val)
        except Exception as exc:
            await ctx.send(f"Failed to update status: {exc}")
            return
        await ctx.send(f"Issue `{issue_id}` status updated to `{status_val}`.")

    @bot.command(name="multica")
    async def multica(ctx: commands.Context, *, args: str) -> None:
        parts = args.split(maxsplit=1)
        if not parts:
            await ctx.send("Use `!multica <action> ...`. Try `!help` for available commands.")
            return

        action = parts[0].lower()
        rest = parts[1] if len(parts) > 1 else ""

        cmd_map = {
            "issue": issue,
            "create": create,
            "comment": comment,
            "assign": assign,
            "status": status,
        }

        command = cmd_map.get(action)
        if command is None:
            await ctx.send(f"Unknown action `{action}`. Available: {', '.join(sorted(cmd_map))}.")
            return

        await ctx.invoke(command, args=rest)


def _format_json(data: object) -> str:
    import json

    return json.dumps(data, indent=2, default=str)
