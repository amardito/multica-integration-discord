# Multica Discord Bot

Discord bot that integrates with Multica and exposes a small allowlisted action set.

## Features
- Starts from environment configuration
- Fails clearly when required config is missing
- Ignores messages outside `DISCORD_CHANNEL_ID`
- Supports issue lookup, issue creation, comment addition, assignment, and status update
- Uses a replaceable Multica client adapter
- Validates command arguments and does not allow arbitrary API calls

## Setup
1. Copy `.env.example` to `.env`
2. Fill in:
   - `DISCORD_BOT_TOKEN`
   - `MULTICA_API_URL`
   - `MULTICA_API_TOKEN`
   - `DISCORD_CHANNEL_ID`
3. Install dependencies:
   - `python -m pip install -e .[dev]`
4. Run:
   - `python -m src.multica_discord`

## Commands
- `!multica issue <issue-id>`
- `!multica create <title> [desc:<description>] [priority:<priority>]`
- `!multica comment <issue-id> <text>`
- `!multica assign <issue-id> <assignee-id>`
- `!multica status <issue-id> <status>`

## Verification
- `ruff check .`
- `ruff format --check .`
- `pytest -v`

## Notes
Docker packaging is intentionally not included here and should be handled separately.