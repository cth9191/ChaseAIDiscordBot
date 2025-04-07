# Chase AI Bot

A Discord bot that processes @mentions and sends them to an n8n workflow for advanced processing with LLMs.

## Features

- Responds to @mentions in Discord channels
- Passes message content to n8n for AI processing
- Receives responses from n8n and replies back to Discord

## Setup

### Prerequisites

- Node.js v18 or higher
- npm
- Discord bot token
- n8n webhook URL

### Installation

1. Clone this repository:
```
git clone https://github.com/cth9191/chase-ai-bot.git
cd chase-ai-bot
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file with the following variables:
```
DISCORD_TOKEN=your_discord_bot_token
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

4. Start the bot:
```
node bot.js
```

### Running with PM2

For persistent operation, you can use PM2:

```
npm install -g pm2
pm2 start bot.js --name "chase-ai-bot"
```

## Discord Bot Setup

1. Create a bot in the [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable the MESSAGE CONTENT intent in the Bot settings
3. Invite the bot to your server

## n8n Integration

This bot is designed to work with an n8n workflow that:
1. Receives the message via webhook
2. Processes the message content (typically with an LLM)
3. Returns a JSON response with a `reply` field

## Deployment

For 24/7 operation, deploy to a cloud service like Render, Railway, or Fly.io.

## License

MIT 