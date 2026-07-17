import httpx
import pytest
import respx

from multica_discord.multica_client import MulticaClient, MulticaError


@pytest.mark.asyncio
async def test_get_issue_success() -> None:
    async with httpx.AsyncClient() as http_client:
        client = MulticaClient(
            base_url="http://example.test",
            api_token="secret",
            workspace_id="workspace-1",
            http_client=http_client,
        )
        with respx.mock(assert_all_called=True) as router:
            route = router.get("http://example.test/api/issues/TEL-89").mock(
                return_value=httpx.Response(200, json={"identifier": "TEL-89", "title": "Hello"})
            )
            result = await client.get_issue("TEL-89")

        assert route.called
        assert result["identifier"] == "TEL-89"


@pytest.mark.asyncio
async def test_get_issue_upstream_failure() -> None:
    async with httpx.AsyncClient() as http_client:
        client = MulticaClient(
            base_url="http://example.test",
            api_token="secret",
            workspace_id="workspace-1",
            http_client=http_client,
        )
        with respx.mock(assert_all_called=True) as router:
            router.get("http://example.test/api/issues/TEL-89").mock(
                return_value=httpx.Response(500, text="boom")
            )
            with pytest.raises(MulticaError):
                await client.get_issue("TEL-89")
