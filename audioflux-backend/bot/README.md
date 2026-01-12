# 🤖 Telegram Bot Module

This module contains all Telegram bot functionality for MusicHub.

## 📁 Structure

```
bot/
├── index.js       # Bot initialization and module loader
├── commands.js    # All bot commands (/start, /help, /play, etc.)
├── callbacks.js   # Callback query handlers (buttons, inline keyboards)
├── events.js      # Bot events (welcome messages, tracking)
└── middleware.js  # Bot middleware (force-join, etc.)
```

## 🎯 Features

### Commands Implemented
- ✅ `/start` - Welcome message with language selection
- ✅ `/help` - Interactive help system
- ⏳ `/play` - Play a song (structure ready)
- ⏳ `/queue` - View playlist (structure ready)
- ⏳ `/skip` - Skip current song (structure ready)
- ⏳ Other commands (structure ready)

### Callbacks Implemented
- ✅ Language selection (EN/HI)
- ✅ Help system navigation
- ✅ Back to start menu
- ⏳ Playback controls (structure ready)

### Events
- ✅ Bot added to group
- ✅ User started bot
- ✅ Force-join channel middleware

## 🔧 How It Works

The bot module is loaded by `server.js` and initializes all components in order:

1. **Middleware** - Force-join channel check
2. **Events** - Welcome messages and tracking
3. **Commands** - All bot commands
4. **Callbacks** - Button and inline keyboard handlers

## 📝 Adding New Commands

To add a new command, edit `commands.js`:

```javascript
bot.command('mycommand', async (ctx) => {
    const L = LForUser(ctx.from.id);
    await ctx.reply(L.my_message, {
        parse_mode: 'Markdown'
    });
});
```

## 📝 Adding New Callbacks

To add a new callback handler, edit `callbacks.js`:

```javascript
bot.action('my_callback', async (ctx) => {
    await ctx.answerCbQuery('Action completed!');
    // Handle the callback
});
```

## 🌍 Language Support

The bot supports English and Hindi. Language strings are in `config/languages.js`.

```javascript
const { LForUser } = require('../config/languages');
const L = LForUser(userId); // Get user's language pack
```

## 🔐 Permissions

Bot commands respect the permission system:
- **Owner** - All commands
- **Moderator** - Mod commands + user commands
- **Approved** - User commands without restrictions
- **Regular** - Basic user commands

Permissions are checked via `permissionService`.

## 📊 Logging

All bot interactions are logged:
- User starts bot
- Bot added to group
- Commands executed
- Songs played
- Errors

Logs are sent to the configured logger group.

## 🚀 Usage

The bot module is automatically loaded by `server.js`. No manual initialization needed.

```javascript
// In server.js
const bot = require('./bot');
// Bot is now running!
```

---

**Part of MusicHub Backend**
