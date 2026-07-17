"""Replaceable Multica API client."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class MulticaError(Exception):
    """Raised when a Multica API call fails or returns an error."""


class MulticaClient:
    """Async HTTP client for the Multica API.

    The client is intentionally narrow: it only exposes the allowlisted
    workspace actions used by the bot. Arbitrary API calls are not supported.
    """

    def __init__(
        self,
        base_url: str,
        api_token: str,
        workspace_id: str,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        """Initialize the client.

        Args:
            base_url: Multica API base URL.
            api_token: API authentication token.
            workspace_id: Workspace UUID.
            http_client: Optional injected ``httpx.AsyncClient`` for testing.
        """
        self._base_url = base_url.rstrip("/")
        self._api_token = api_token
        self._workspace_id = workspace_id
        self._client = http_client or httpx.AsyncClient()

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_token}",
            "Content-Type": "application/json",
            "X-Workspace-ID": self._workspace_id,
        }

    def _url(self, path: str) -> str:
        return f"{self._base_url}{path}"

    async def get_issue(self, issue_id: str) -> dict[str, Any]:
        """Fetch an issue by UUID or identifier.

        Args:
            issue_id: Issue UUID or identifier (e.g. ``TEL-89``).

        Returns:
            Parsed JSON response.

        Raises:
            MulticaError: If the API returns an error or the request fails.
        """
        try:
            response = await self._client.get(
                self._url(f"/api/issues/{issue_id}"),
                headers=self._headers,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("Multica API returned HTTP %s", exc.response.status_code)
            raise MulticaError(
                f"Multica API error: {exc.response.status_code} {exc.response.reason_phrase}"
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Multica API request failed: %s", exc)
            raise MulticaError(f"Multica API request failed: {exc}") from exc
        return response.json()

    async def create_issue(
        self,
        title: str,
        description: str | None = None,
        priority: str | None = None,
        assignee_id: str | None = None,
    ) -> dict[str, Any]:
        """Create a new issue.

        Args:
            title: Issue title.
            description: Optional issue description.
            priority: Optional priority value.
            assignee_id: Optional assignee UUID.

        Returns:
            Created issue JSON.
        """
        payload: dict[str, Any] = {"title": title}
        if description:
            payload["description"] = description
        if priority:
            payload["priority"] = priority
        if assignee_id:
            payload["assignee_id"] = assignee_id

        try:
            response = await self._client.post(
                self._url("/api/issues"),
                headers=self._headers,
                json=payload,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("Multica API returned HTTP %s", exc.response.status_code)
            raise MulticaError(
                f"Multica API error: {exc.response.status_code} {exc.response.reason_phrase}"
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Multica API request failed: %s", exc)
            raise MulticaError(f"Multica API request failed: {exc}") from exc
        return response.json()

    async def add_comment(self, issue_id: str, content: str) -> dict[str, Any]:
        """Add a comment to an issue.

        Args:
            issue_id: Target issue UUID or identifier.
            content: Comment text.

        Returns:
            Created comment JSON.
        """
        try:
            response = await self._client.post(
                self._url(f"/api/issues/{issue_id}/comments"),
                headers=self._headers,
                json={"content": content},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("Multica API returned HTTP %s", exc.response.status_code)
            raise MulticaError(
                f"Multica API error: {exc.response.status_code} {exc.response.reason_phrase}"
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Multica API request failed: %s", exc)
            raise MulticaError(f"Multica API request failed: {exc}") from exc
        return response.json()

    async def assign_issue(self, issue_id: str, assignee_id: str) -> dict[str, Any]:
        """Assign an issue.

        Args:
            issue_id: Target issue UUID or identifier.
            assignee_id: Assignee UUID.

        Returns:
            Updated issue JSON.
        """
        try:
            response = await self._client.put(
                self._url(f"/api/issues/{issue_id}/assignee"),
                headers=self._headers,
                json={"assignee_id": assignee_id},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("Multica API returned HTTP %s", exc.response.status_code)
            raise MulticaError(
                f"Multica API error: {exc.response.status_code} {exc.response.reason_phrase}"
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Multica API request failed: %s", exc)
            raise MulticaError(f"Multica API request failed: {exc}") from exc
        return response.json()

    async def update_status(self, issue_id: str, status: str) -> dict[str, Any]:
        """Update an issue status.

        Args:
            issue_id: Target issue UUID or identifier.
            status: New status value.

        Returns:
            Updated issue JSON.
        """
        try:
            response = await self._client.put(
                self._url(f"/api/issues/{issue_id}/status"),
                headers=self._headers,
                json={"status": status},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning("Multica API returned HTTP %s", exc.response.status_code)
            raise MulticaError(
                f"Multica API error: {exc.response.status_code} {exc.response.reason_phrase}"
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Multica API request failed: %s", exc)
            raise MulticaError(f"Multica API request failed: {exc}") from exc
        return response.json()

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()


__all__ = ["MulticaClient", "MulticaError"]
