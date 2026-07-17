from types import SimpleNamespace

import pytest

from multica_discord.bot import MulticaDiscordBot
from multica_discord.config import BotConfig
from multica_discord.multica_client import MulticaError


class FakeQuestionHandler:
    async def answer(self, _text: str) -> str:
        return "question-answer"


class FakeMulticaClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple[str, ...]]] = []
        self.issue = {"identifier": "TEL-89", "title": "Title", "status": "todo"}
        self.fail_with: Exception | None = None

    async def get_issue(self, issue_id: str):
        self.calls.append(("get_issue", (issue_id,)))
        if self.fail_with:
            raise self.fail_with
        return self.issue

    async def create_issue(self, title: str, description=None, priority=None, assignee_id=None):
        self.calls.append(("create_issue", (title, description, priority, assignee_id)))
        if self.fail_with:
            raise self.fail_with
        return {"identifier": "TEL-99", "title": title}

    async def add_comment(self, issue_id: str, content: str):
        self.calls.append(("add_comment", (issue_id, content)))
        if self.fail_with:
            raise self.fail_with
        return {"ok": True}

    async def assign_issue(self, issue_id: str, assignee_id: str):
        self.calls.append(("assign_issue", (issue_id, assignee_id)))
        if self.fail_with:
            raise self.fail_with
        return {"ok": True}

    async def update_status(self, issue_id: str, status: str):
        self.calls.append(("update_status", (issue_id, status)))
        if self.fail_with:
            raise self.fail_with
        return {"ok": True}


class FakeMessage:
    def __init__(self, *, channel_id: int, content: str, is_bot: bool = False) -> None:
        self.content = content
        self.channel = SimpleNamespace(id=channel_id)
        self.author = SimpleNamespace(bot=is_bot)
        self.replies: list[str] = []

    async def reply(self, text: str) -> None:
        self.replies.append(text)


@pytest.fixture
def config() -> BotConfig:
    return BotConfig.model_validate(
        {
            "DISCORD_BOT_TOKEN": "token",
            "DISCORD_CHANNEL_ID": 1234,
            "MULTICA_API_BASE_URL": "http://example.test",
            "MULTICA_API_TOKEN": "secret",
            "MULTICA_WORKSPACE_ID": "workspace-1",
            "LOG_LEVEL": "INFO",
        }
    )


@pytest.mark.asyncio
async def test_ignores_messages_outside_configured_channel(config: BotConfig) -> None:
    client = FakeMulticaClient()
    bot = MulticaDiscordBot(config=config, multica_client=client)
    message = FakeMessage(channel_id=9999, content="!issue TEL-89")

    await bot.on_message(message)

    assert message.replies == []
    assert client.calls == []


@pytest.mark.asyncio
async def test_ignores_bot_messages(config: BotConfig) -> None:
    client = FakeMulticaClient()
    bot = MulticaDiscordBot(config=config, multica_client=client)
    message = FakeMessage(channel_id=1234, content="!issue TEL-89", is_bot=True)

    await bot.on_message(message)

    assert message.replies == []
    assert client.calls == []


@pytest.mark.asyncio
async def test_routes_question_messages(config: BotConfig) -> None:
    client = FakeMulticaClient()
    bot = MulticaDiscordBot(
        config=config,
        multica_client=client,
        question_handler=FakeQuestionHandler(),
    )
    message = FakeMessage(channel_id=1234, content="how do i use this?")

    await bot.on_message(message)

    assert message.replies == ["question-answer"]
    assert client.calls == []


@pytest.mark.asyncio
async def test_validates_bad_command_input(config: BotConfig) -> None:
    client = FakeMulticaClient()
    bot = MulticaDiscordBot(config=config, multica_client=client)
    message = FakeMessage(channel_id=1234, content="!status TEL-89 nope")

    await bot.on_message(message)

    assert len(message.replies) == 1
    assert message.replies[0].startswith("Invalid input:")
    assert client.calls == []


@pytest.mark.asyncio
async def test_executes_issue_lookup(config: BotConfig) -> None:
    client = FakeMulticaClient()
    bot = MulticaDiscordBot(config=config, multica_client=client)
    message = FakeMessage(channel_id=1234, content="!issue TEL-89")

    await bot.on_message(message)

    assert client.calls == [("get_issue", ("TEL-89",))]
    assert "TEL-89" in message.replies[0]


@pytest.mark.asyncio
async def test_executes_comment_addition(config: BotConfig) -> None:
    client = FakeMulticaClient()
    bot = MulticaDiscordBot(config=config, multica_client=client)
    message = FakeMessage(channel_id=1234, content="!comment TEL-89 hello world")

    await bot.on_message(message)

    assert client.calls == [("add_comment", ("TEL-89", "hello world"))]
    assert message.replies == ["Comment added."]


@pytest.mark.asyncio
async def test_handles_upstream_failure(config: BotConfig) -> None:
    client = FakeMulticaClient()
    client.fail_with = MulticaError("boom")
    bot = MulticaDiscordBot(config=config, multica_client=client)
    message = FakeMessage(channel_id=1234, content="!issue TEL-89")

    await bot.on_message(message)

    assert message.replies == ["Upstream error: boom"]
