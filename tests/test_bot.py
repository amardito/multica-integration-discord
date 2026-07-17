from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.multica_discord.bot import MulticaBot
from src.multica_discord.config import Config

VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"


class FakeAuthor:
    def __init__(self, bot: bool = False) -> None:
        self.bot = bot


class FakeChannel:
    def __init__(self, channel_id: int) -> None:
        self.id = channel_id


class FakeMessage:
    def __init__(self, channel_id: int, bot_author: bool = False) -> None:
        self.author = FakeAuthor(bot_author)
        self.channel = FakeChannel(channel_id)


def _make_bot(multica_client):
    from src.multica_discord.bot import _register_commands

    config = Config.model_construct(
        discord_bot_token="discord-token",
        multica_api_url="https://api.example.com",
        multica_api_token="multica-token",
        discord_channel_id="123",
    )
    bot = MulticaBot(config, multica_client)
    _register_commands(bot)
    return bot


@pytest.fixture
def multica_client() -> AsyncMock:
    client = AsyncMock()
    client.get_issue.return_value = {"id": VALID_UUID, "title": "Issue"}
    client.create_issue.return_value = {"id": VALID_UUID, "title": "Created"}
    client.add_comment.return_value = {"ok": True}
    client.assign_issue.return_value = {"ok": True}
    client.update_status.return_value = {"ok": True}
    return client


@pytest.mark.asyncio
async def test_on_message_ignores_other_channels(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    bot.process_commands = AsyncMock()

    await bot.on_message(FakeMessage(channel_id=999))

    bot.process_commands.assert_not_awaited()


@pytest.mark.asyncio
async def test_on_message_processes_allowed_channel(
    multica_client: AsyncMock,
) -> None:
    bot = _make_bot(multica_client)
    bot.process_commands = AsyncMock()

    await bot.on_message(FakeMessage(channel_id=123))

    bot.process_commands.assert_awaited_once()


@pytest.mark.asyncio
async def test_on_message_ignores_bot_author(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    bot.process_commands = AsyncMock()

    await bot.on_message(FakeMessage(channel_id=123, bot_author=True))

    bot.process_commands.assert_not_awaited()


@pytest.mark.asyncio
async def test_issue_command_success(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("issue")
    assert command is not None
    await command.callback(ctx, issue_id=VALID_UUID)

    multica_client.get_issue.assert_awaited_once_with(VALID_UUID)
    send.assert_awaited_once()


@pytest.mark.asyncio
async def test_issue_command_invalid_uuid(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("issue")
    assert command is not None
    await command.callback(ctx, issue_id="bad")

    multica_client.get_issue.assert_not_called()
    send.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_command_success(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("create")
    assert command is not None
    await command.callback(ctx, args='"Fix login" desc:broken priority:high')

    multica_client.create_issue.assert_awaited_once_with("Fix login", "broken priority:high", None)
    send.assert_awaited_once()


@pytest.mark.asyncio
async def test_comment_command_success(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("comment")
    assert command is not None
    await command.callback(ctx, args=f"{VALID_UUID} hello there")

    multica_client.add_comment.assert_awaited_once_with(VALID_UUID, "hello there")
    send.assert_awaited_once()


@pytest.mark.asyncio
async def test_comment_command_requires_text(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("comment")
    assert command is not None
    await command.callback(ctx, args=VALID_UUID)

    multica_client.add_comment.assert_not_called()
    send.assert_awaited_once()


@pytest.mark.asyncio
async def test_assign_command_success(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("assign")
    assert command is not None
    await command.callback(ctx, args=f"{VALID_UUID} {VALID_UUID}")

    multica_client.assign_issue.assert_awaited_once_with(VALID_UUID, VALID_UUID)
    send.assert_awaited_once()


@pytest.mark.asyncio
async def test_status_command_success(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("status")
    assert command is not None
    await command.callback(ctx, args=f"{VALID_UUID} done")

    multica_client.update_status.assert_awaited_once_with(VALID_UUID, "done")
    send.assert_awaited_once()


@pytest.mark.asyncio
async def test_status_command_invalid_status(multica_client: AsyncMock) -> None:
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("status")
    assert command is not None
    await command.callback(ctx, args=f"{VALID_UUID} invalid")

    multica_client.update_status.assert_not_called()
    send.assert_awaited_once()


@pytest.mark.asyncio
async def test_issue_command_upstream_failure(multica_client: AsyncMock) -> None:
    multica_client.get_issue.side_effect = RuntimeError("upstream down")
    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    command = bot.get_command("issue")
    assert command is not None
    await command.callback(ctx, issue_id=VALID_UUID)

    send.assert_awaited_once()
    assert "Failed to retrieve issue" in send.await_args.args[0]


@pytest.mark.asyncio
async def test_on_command_error_unknown_command(multica_client: AsyncMock) -> None:
    from discord.ext.commands import CommandNotFound

    bot = _make_bot(multica_client)
    send = AsyncMock()
    ctx = SimpleNamespace(send=send)

    await bot.on_command_error(ctx, CommandNotFound())

    send.assert_awaited_once()
    assert "Unknown command" in send.await_args.args[0]
