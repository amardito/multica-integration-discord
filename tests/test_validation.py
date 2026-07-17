import pytest

from src.multica_discord.validation import (
    validate_assignee,
    validate_issue_id,
    validate_non_empty,
    validate_status,
)

VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"


def test_validate_issue_id_accepts_uuid() -> None:
    assert validate_issue_id(VALID_UUID) == VALID_UUID


def test_validate_issue_id_rejects_non_uuid() -> None:
    with pytest.raises(ValueError):
        validate_issue_id("not-a-uuid")


def test_validate_status_accepts_allowed_value() -> None:
    assert validate_status("DONE") == "done"


def test_validate_status_rejects_unknown_value() -> None:
    with pytest.raises(ValueError):
        validate_status("deployed")


def test_validate_non_empty_accepts_text() -> None:
    assert validate_non_empty(" hello ", label="title") == "hello"


def test_validate_non_empty_rejects_blank() -> None:
    with pytest.raises(ValueError):
        validate_non_empty("   ", label="title")


def test_validate_assignee_accepts_uuid() -> None:
    assert validate_assignee(VALID_UUID) == VALID_UUID


def test_validate_assignee_rejects_non_uuid() -> None:
    with pytest.raises(ValueError):
        validate_assignee("abc")
