from unittest.mock import patch

import pytest

from src.multica_discord.multica_client import MulticaClient


@pytest.mark.asyncio
async def test_get_issue_calls_expected_endpoint() -> None:
    captured: dict[str, object] = {}

    async def fake_request(method, url, *, json=None, headers=None):
        captured.update({"method": method, "url": url, "json": json, "headers": headers})
        return {"id": "123"}

    client = MulticaClient("https://api.example.com/", "token")
    with patch.object(client, "_request", side_effect=fake_request):
        result = await client.get_issue("123")

    assert result == {"id": "123"}
    assert captured["method"] == "GET"
    assert captured["url"] == "/api/issues/123"


@pytest.mark.asyncio
async def test_create_issue_posts_expected_payload() -> None:
    captured: dict[str, object] = {}

    async def fake_request(method, url, *, json=None, headers=None):
        captured.update({"method": method, "url": url, "json": json})
        return {"id": "new-id"}

    client = MulticaClient("https://api.example.com", "token")
    with patch.object(client, "_request", side_effect=fake_request):
        result = await client.create_issue("Hello", "Desc", "high")

    assert result["id"] == "new-id"
    assert captured["method"] == "POST"
    assert captured["url"] == "/api/issues"
    assert captured["json"] == {"title": "Hello", "description": "Desc", "priority": "high"}


@pytest.mark.asyncio
async def test_add_comment_calls_expected_endpoint() -> None:
    captured: dict[str, object] = {}

    async def fake_request(method, url, *, json=None, headers=None):
        captured.update({"method": method, "url": url, "json": json})
        return {"ok": True}

    client = MulticaClient("https://api.example.com", "token")
    with patch.object(client, "_request", side_effect=fake_request):
        result = await client.add_comment("123", "hello")

    assert result == {"ok": True}
    assert captured["method"] == "POST"
    assert captured["url"] == "/api/issues/123/comments"
    assert captured["json"] == {"content": "hello"}


@pytest.mark.asyncio
async def test_assign_issue_calls_expected_endpoint() -> None:
    captured: dict[str, object] = {}

    async def fake_request(method, url, *, json=None, headers=None):
        captured.update({"method": method, "url": url, "json": json})
        return {"ok": True}

    client = MulticaClient("https://api.example.com", "token")
    with patch.object(client, "_request", side_effect=fake_request):
        result = await client.assign_issue("123", "user-1")

    assert result == {"ok": True}
    assert captured["method"] == "PUT"
    assert captured["url"] == "/api/issues/123/assignee"
    assert captured["json"] == {"assignee_id": "user-1"}


@pytest.mark.asyncio
async def test_update_status_calls_expected_endpoint() -> None:
    captured: dict[str, object] = {}

    async def fake_request(method, url, *, json=None, headers=None):
        captured.update({"method": method, "url": url, "json": json})
        return {"ok": True}

    client = MulticaClient("https://api.example.com", "token")
    with patch.object(client, "_request", side_effect=fake_request):
        result = await client.update_status("123", "done")

    assert result == {"ok": True}
    assert captured["method"] == "PUT"
    assert captured["url"] == "/api/issues/123/status"
    assert captured["json"] == {"status": "done"}


@pytest.mark.asyncio
async def test_upstream_http_error_bubbles() -> None:
    import httpx

    async def fake_request(method, url, *, json=None, headers=None):
        raise httpx.HTTPStatusError(
            "error",
            request=httpx.Request("GET", "https://example.com"),
            response=httpx.Response(500),
        )

    client = MulticaClient("https://api.example.com", "token")
    with patch.object(client, "_request", side_effect=fake_request):
        with pytest.raises(httpx.HTTPStatusError):
            await client.get_issue("123")


@pytest.mark.asyncio
async def test_network_error_bubbles() -> None:
    async def fake_request(method, url, *, json=None, headers=None):
        raise ConnectionError("boom")

    client = MulticaClient("https://api.example.com", "token")
    with patch.object(client, "_request", side_effect=fake_request):
        with pytest.raises(ConnectionError):
            await client.get_issue("123")
