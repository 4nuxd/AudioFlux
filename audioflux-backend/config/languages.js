/**
 * Language Pack for Bot
 * Supports English (en) and Hindi (hi)
 */

const LANG = {
    en: {
        start_caption_dm: `🎧 *Welcome to MusicHub Mini Player!*\n\nYour advanced Telegram music system with synced playback.\nUse this bot *inside a group* for full features.`,
        start_caption_group: `🎧 *MusicHub Player is Active in this Group!*\n\nUse:\n• /play <song> — auto-play best match\n• /mplay <song> — choose from 5 options\n• /queue — see playlist\n• /np — now playing\n• /skip — vote skip\n• /player — open synced web player.`,

        btn_add_group: '➕ Add to Group',
        btn_help: '❓ Help',
        btn_updates: '📢 Updates',
        btn_support: '🔧 Support Chat',
        btn_owner: '👑 Owner',
        btn_lang: '🌐 Language',

        help_title: '📘 Help Menu\nSelect a category:',
        help_player: '🎵 Player',
        help_mod: '🛠 Mods',
        help_owner: '👑 Owner',
        help_actions: '⚡ Actions',
        back: '⬅ Back',

        play_help: '▶️ *Play Commands*\n\n• `/play <song>` — Auto-play best match\n  Example: `/play tum hi ho`\n\n• `/mplay <song>` — Choose from 5 options\n  Example: `/mplay arijit singh`\n\nBoth add songs to the queue.',
        skip_help: '⏭ *Skip Command*\nUsage: /skip\nStarts a vote to skip the current track.',
        mod_help: '🛠 *Moderator Commands*\n/ban <id> — ban user\n/unban <id> — unban user\n/addapproved <id> — approve user to forceplay & skip\n/delapproved <id> — remove approved',
        owner_help: '👑 *Owner Commands*\n/setowner <id> — set chat owner\n/addmod <id> — add moderator\n/delmod <id> — remove moderator',

        no_song_play: '❗ *You must provide a song name.*\n\nExample:\n`/play arijit singh`',
        now_playing_notify: '🎧 *Now Playing in Group Player*\nTap below to open the synced player.'
    },

    hi: {
        start_caption_dm: `🎧 *MusicHub Mini Player में स्वागत है!*\n\nYour advanced Telegram music system with synced playback.\nUse this bot *inside a group* for full features.`,
        start_caption_group: `🎧 *MusicHub प्लेयर इस ग्रुप में सक्रिय है!*\n\nइस्तेमाल करें:\n• /play <गीत> — बेस्ट मैच ऑटो-प्ले\n• /mplay <गीत> — 5 विकल्पों में से चुनें\n• /queue — प्लेलिस्ट देखें\n• /np — अभी क्या चल रहा है\n• /skip — स्किप वोट\n• /player — synced वेब प्लेयर खोलें।`,

        btn_add_group: '➕ ग्रुप में जोड़ें',
        btn_help: '❓ मदद',
        btn_updates: '📢 अपडेट्स',
        btn_support: '🔧 सपोर्ट चैट',
        btn_owner: '👑 ओनर',
        btn_lang: '🌐 भाषा',

        help_title: '📘 मदद मेन्यू\nएक श्रेणी चुनें:',
        help_player: '🎵 प्लेयर',
        help_mod: '🛠 मॉड्स',
        help_owner: '👑 ओनर',
        help_actions: '⚡ एक्शन',
        back: '⬅ वापस',

        play_help: '▶️ *प्ले कमांड*\n\n• `/play <गीत>` — बेस्ट मैच ऑटो-प्ले\n  उदाहरण: `/play tum hi ho`\n\n• `/mplay <गीत>` — 5 विकल्पों में से चुनें\n  उदाहरण: `/mplay arijit singh`\n\nदोनों क्यू में गाना जोड़ते हैं।',
        skip_help: '⏭ *स्किप कमांड*\nउपयोग: /skip\nवर्तमान ट्रैक को स्किप करने के लिए वोट शुरू करता है।',
        mod_help: '🛠 *मॉड कमांड*\n/ban <id> — यूज़र को बैन\n/unban <id> — अनबैन\n/addapproved <id> — अप्रूव्ड यूज़र\n/delapproved <id> — अप्रूव्ड हटाएँ',
        owner_help: '👑 *ओनर कमांड*\n/setowner <id> — ओनर सेट करें\n/addmod <id> — मॉड जोड़ें\n/delmod <id> — मॉड हटाएँ',

        no_song_play: '❗ *आपको गाने का नाम देना होगा।*\n\nउदाहरण:\n`/play arijit singh`',
        now_playing_notify: '🎧 *अब प्लेयर में गाना चल रहा है*\nनीचे टैप करके synced प्लेयर खोलें।'
    }
};

// In-memory user language preferences (should be moved to Redis in production)
const userLang = {}; // { userId: 'en' | 'hi' }

/**
 * Get language pack for user
 * @param {number|string} userId - User ID
 * @returns {object} Language pack
 */
function LForUser(userId) {
    const lang = userLang[userId] || process.env.DEFAULT_LANG || 'en';
    return LANG[lang] || LANG['en'];
}

/**
 * Set user language preference
 * @param {number|string} userId - User ID
 * @param {string} lang - Language code ('en' or 'hi')
 */
function setUserLanguage(userId, lang) {
    if (LANG[lang]) {
        userLang[userId] = lang;
    }
}

module.exports = {
    LANG,
    LForUser,
    setUserLanguage,
    userLang
};
