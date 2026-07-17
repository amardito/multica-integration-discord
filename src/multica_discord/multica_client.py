from typing import Any, Protocol

import httpx


class MulticaClientProtocol(Protocol):
    async def get_issue(self, issue_id: str) -> dict[str, Any]: ...
    async def create_issue(
        self, title: str, description: str | None = None, priority: str | None = None
    ) -> dict[str, Any]: ...
    async def add_comment(self, issue_id: str, content: str) -> dict[str, Any]: ...
    async def assign_issue(self, issue_id: str, assignee_id: str) -> dict[str, Any]: ...
    async def update_status(self, issue_id: str, status: str) -> dict[str, Any]: ...


class MulticaClient:
    def __init__(self, base_url: str, token: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _request(
        self, method: str, path: str, json: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(method, url, json=json, headers=self._headers)
            response.raise_for_status()
            return response.json()

    async def get_issue(self, issue_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/api/issues/{issue_id}")

    async def create_issue(
        self, title: str, description: str | None = None, priority: str | None = None
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"title": title}
        if description:
            body["description"] = description
        if priority:
            body["priority"] = priority
        return await self._request("POST", "/api/issues", json=body)

    async def add_comment(self, issue_id: str, content: str) -> dict[str, Any]:
        return await self._request(
            "POST", f"/api/issues/{issue_id}/comments", json={"content": content}
        )

    async def assign_issue(self, issue_id: str, assignee_id: str) -> dict[str, Any]:
        return await self._request(
            "PUT", f"/api/issues/{issue_id}/assignee", json={"assignee_id": assignee_id}
        )

    async def update_status(self, issue_id: str, status: str) -> dict[str, Any]:
        return await self._request("PUT", f"/api/issues/{issue_id}/status", json={"status": status})
