import re

ALLOWED_STATUSES = frozenset(
    {"todo", "in_progress", "in_review", "done", "blocked", "backlog", "cancelled"}
)

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def validate_issue_id(value: str) -> str:
    stripped = value.strip()
    if not UUID_RE.match(stripped):
        raise ValueError(f"invalid issue id: {value!r}")
    return stripped


def validate_status(value: str) -> str:
    stripped = value.strip().lower()
    if stripped not in ALLOWED_STATUSES:
        raise ValueError(f"invalid status: {value!r}. Must be one of: {sorted(ALLOWED_STATUSES)}")
    return stripped


def validate_non_empty(value: str, label: str = "value") -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{label} must not be empty")
    return stripped


def validate_assignee(value: str) -> str:
    stripped = value.strip()
    if not UUID_RE.match(stripped):
        raise ValueError(f"invalid assignee id: {value!r}")
    return stripped
