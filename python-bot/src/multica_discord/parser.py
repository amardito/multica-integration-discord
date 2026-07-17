"""Message parsing and validation for Discord commands."""

from __future__ import annotations

import argparse
import re
import shlex
from dataclasses import dataclass
from typing import ClassVar


class ValidationError(Exception):
    """Raised when user input fails validation."""


@dataclass(frozen=True)
class ParsedCommand:
    """A parsed, validated command from a Discord message."""

    name: str
    args: dict[str, str | None]


class CommandParser:
    """Parse and validate Discord messages into allowlisted commands.

    Only a fixed set of commands is supported. Any message that does not match
    one of these commands is treated as a question.
    """

    ALLOWED_STATUSES: ClassVar[set[str]] = {
        "todo",
        "in_progress",
        "in_review",
        "done",
        "blocked",
        "backlog",
        "cancelled",
    }
    ALLOWED_PRIORITIES: ClassVar[set[str]] = {"high", "medium", "low"}
    UUID_RE: ClassVar[re.Pattern[str]] = re.compile(
        r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
        r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    )
    IDENTIFIER_RE: ClassVar[re.Pattern[str]] = re.compile(r"^[A-Z]+-\d+$")

    @classmethod
    def looks_like_issue_id(cls, value: str) -> bool:
        """Return True if the value is a UUID or issue identifier."""
        return bool(cls.UUID_RE.match(value) or cls.IDENTIFIER_RE.match(value))

    @classmethod
    def parse(cls, message: str) -> ParsedCommand:
        """Parse a raw message into a command.

        Args:
            message: Raw message content.

        Returns:
            A ``ParsedCommand`` with the command name and validated arguments.

        Raises:
            ValidationError: If the command is malformed or arguments are invalid.
        """
        message = message.strip()
        if not message:
            raise ValidationError("Empty message")

        # Treat everything that is not a known bang-command as a question.
        if not message.startswith("!"):
            return ParsedCommand(name="question", args={"text": message})

        try:
            parts = shlex.split(message[1:])
        except ValueError as exc:
            raise ValidationError(f"Invalid command syntax: {exc}") from exc

        if not parts:
            raise ValidationError("Empty command")

        name = parts[0].lower()
        args = parts[1:]

        if name == "issue":
            return cls._parse_issue(args)
        if name == "comment":
            return cls._parse_comment(args)
        if name == "create":
            return cls._parse_create(args)
        if name == "assign":
            return cls._parse_assign(args)
        if name == "status":
            return cls._parse_status(args)

        raise ValidationError(f"Unknown command: !{name}")

    @classmethod
    def _parse_issue(cls, args: list[str]) -> ParsedCommand:
        if len(args) != 1:
            raise ValidationError("Usage: !issue <id>")
        issue_id = args[0]
        if not cls.looks_like_issue_id(issue_id):
            raise ValidationError(f"Invalid issue id: {issue_id}")
        return ParsedCommand(name="issue", args={"issue_id": issue_id})

    @classmethod
    def _parse_comment(cls, args: list[str]) -> ParsedCommand:
        if len(args) < 2:
            raise ValidationError("Usage: !comment <issue-id> <text>")
        issue_id, *rest = args
        if not cls.looks_like_issue_id(issue_id):
            raise ValidationError(f"Invalid issue id: {issue_id}")
        content = " ".join(rest).strip()
        if not content:
            raise ValidationError("Comment content cannot be empty")
        return ParsedCommand(name="comment", args={"issue_id": issue_id, "content": content})

    @classmethod
    def _parse_create(cls, args: list[str]) -> ParsedCommand:
        if not args:
            raise ValidationError("Usage: !create <title> [options]")

        parser = argparse.ArgumentParser(add_help=False)
        parser.add_argument("title", nargs="+")
        parser.add_argument("--description", default=None)
        parser.add_argument("--priority", default=None, choices=cls.ALLOWED_PRIORITIES)
        parser.add_argument("--assignee", default=None)

        try:
            parsed, remaining = parser.parse_known_args(args)
        except SystemExit as exc:
            raise ValidationError(
                "Usage: !create <title> [--description ...] "
                "[--priority high|medium|low] [--assignee ...]"
            ) from exc

        if remaining:
            raise ValidationError(f"Unexpected arguments: {' '.join(remaining)}")

        title = " ".join(parsed.title).strip()
        if not title:
            raise ValidationError("Issue title cannot be empty")
        if len(title) > 200:
            raise ValidationError("Issue title must be 200 characters or fewer")

        result: dict[str, str | None] = {"title": title}
        if parsed.description:
            result["description"] = parsed.description
        if parsed.priority:
            result["priority"] = parsed.priority
        if parsed.assignee:
            if not cls.UUID_RE.match(parsed.assignee):
                raise ValidationError(f"Invalid assignee UUID: {parsed.assignee}")
            result["assignee_id"] = parsed.assignee

        return ParsedCommand(name="create", args=result)

    @classmethod
    def _parse_assign(cls, args: list[str]) -> ParsedCommand:
        if len(args) != 2:
            raise ValidationError("Usage: !assign <issue-id> <assignee-id>")
        issue_id, assignee_id = args
        if not cls.looks_like_issue_id(issue_id):
            raise ValidationError(f"Invalid issue id: {issue_id}")
        if not cls.UUID_RE.match(assignee_id):
            raise ValidationError(f"Invalid assignee UUID: {assignee_id}")
        return ParsedCommand(name="assign", args={"issue_id": issue_id, "assignee_id": assignee_id})

    @classmethod
    def _parse_status(cls, args: list[str]) -> ParsedCommand:
        if len(args) != 2:
            raise ValidationError("Usage: !status <issue-id> <status>")
        issue_id, status = args
        if not cls.looks_like_issue_id(issue_id):
            raise ValidationError(f"Invalid issue id: {issue_id}")
        if status not in cls.ALLOWED_STATUSES:
            raise ValidationError(
                f"Invalid status: {status}. Allowed: {', '.join(sorted(cls.ALLOWED_STATUSES))}"
            )
        return ParsedCommand(name="status", args={"issue_id": issue_id, "status": status})


__all__ = ["CommandParser", "ParsedCommand", "ValidationError"]
