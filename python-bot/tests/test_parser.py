import pytest

from multica_discord.parser import CommandParser, ValidationError


@pytest.mark.parametrize(
    ("message", "expected_name"),
    [
        ("what can you do?", "question"),
        ("!issue TEL-89", "issue"),
        (
            "!comment TEL-89 hello there",
            "comment",
        ),
        (
            "!assign TEL-89 74a91035-8901-429f-a2b6-3338baa38d67",
            "assign",
        ),
        ("!status TEL-89 in_review", "status"),
    ],
)
def test_parse_known_commands(message: str, expected_name: str) -> None:
    parsed = CommandParser.parse(message)
    assert parsed.name == expected_name


def test_parse_create_command() -> None:
    parsed = CommandParser.parse(
        "!create Test issue --description details --priority high "
        "--assignee 74a91035-8901-429f-a2b6-3338baa38d67"
    )
    assert parsed.name == "create"
    assert parsed.args["title"] == "Test issue"
    assert parsed.args["description"] == "details"
    assert parsed.args["priority"] == "high"


@pytest.mark.parametrize(
    "message",
    [
        "!issue not-an-id",
        "!comment TEL-89",
        "!assign TEL-89 nope",
        "!status TEL-89 whatever",
        "!unknown hi",
    ],
)
def test_reject_invalid_commands(message: str) -> None:
    with pytest.raises(ValidationError):
        CommandParser.parse(message)
