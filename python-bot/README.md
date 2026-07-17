# Multica Discord Bot

Interactive Discord bot for Multica workspace actions. Responds only in the configured Discord channel and exposes a small allowlisted set of commands backed by the Multica API.

## Supported commands

- `!issue <id>` — look up an issue by identifier or UUID.
- `!comment <issue-id> <text>` — add a comment to an issue.
- `!create <title> [--description <text>] [--priority high|medium|low] [--assignee <id>]` — create a new issue.
- `!assign <issue-id> <assignee-id>` — assign an issue to a user or agent.
- `!status <issue-id> <status>` — update an issue status (e.g. `todo`, `in_progress`, `done`).
- Any other message is treated as a question and answered with a help/usage response.

Messages outside the configured `DISCORD_CHANNEL_ID` are ignored.

## Setup

1. Create a Python virtual environment and install dependencies:

```bash
cd python-bot
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

2. Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

3. Run the bot:

```bash
python -m multica_discord
```

The bot exits immediately if required configuration is missing.

## Development

```bash
ruff check .
ruff format .
pytest
```

## Docker

Docker-specific packaging for this bot should be handled by DevOps so that it does not conflict with the existing Node.js alert-delivery worker in the repository root.

## Environment variables

- `DISCORD_BOT_TOKEN` (required): Discord bot token.
- `DISCORD_CHANNEL_ID` (required): Target Discord channel ID.
- `MULTICA_API_BASE_URL` (required): Multica API base URL.
- `MULTICA_API_TOKEN` (required): Multica API token.
- `MULTICA_WORKSPACE_ID` (required): Multica workspace UUID.
- `LOG_LEVEL` (optional): Logging level, default `INFO`.
