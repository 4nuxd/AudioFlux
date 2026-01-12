# Lyrics API Documentation

## Overview
The AudioFlux Lyrics API provides multi-source lyrics fetching with intelligent fallback:
1. **JioSaavn** (Primary) - Best for Indian/Bollywood songs
2. **lyrics.ovh** (Secondary) - Best for English/International songs  
3. **Genius** (Tertiary) - Fallback with metadata only

## Endpoints

### 1. Get Lyrics by JioSaavn Song ID
**Endpoint:** `GET /api/lyrics/jiosaavn/:songId`

**Description:** Fetch lyrics directly from JioSaavn using a song ID.

**Parameters:**
- `songId` (path parameter) - JioSaavn song ID

**Example Request:**
```bash
curl http://localhost:5000/api/lyrics/jiosaavn/K8GXHF5k
```

**Example Response:**
```json
{
  "songId": "K8GXHF5k",
  "lyrics": "शोहरतें तो नहीं हैं मिली\n ना रईस हूँ मैं बड़ा...",
  "source": "jiosaavn",
  "synced": false
}
```

**Error Response (404):**
```json
{
  "error": "Lyrics not found for this song"
}
```

---

### 2. Get Lyrics by Artist and Title (Multi-source)
**Endpoint:** `GET /api/lyrics/:artist/:title`

**Description:** Fetch lyrics using artist and title. Tries multiple sources with intelligent fallback.

**Parameters:**
- `artist` (path parameter) - Artist name
- `title` (path parameter) - Song title
- `songId` (query parameter, optional) - JioSaavn song ID for better accuracy

**Example Request (without songId):**
```bash
curl http://localhost:5000/api/lyrics/Arijit%20Singh/Channa%20Mereya
```

**Example Request (with songId for better results):**
```bash
curl "http://localhost:5000/api/lyrics/Arijit%20Singh/Channa%20Mereya?songId=K8GXHF5k"
```

**Example Response:**
```json
{
  "artist": "Arijit Singh",
  "title": "Channa Mereya",
  "lyrics": [
    {
      "time": 0,
      "text": "शोहरतें तो नहीं हैं मिली"
    },
    {
      "time": 3,
      "text": "ना रईस हूँ मैं बड़ा"
    }
  ],
  "synced": false,
  "source": "jiosaavn",
  "url": null
}
```

**Error Response (404):**
```json
{
  "error": "Lyrics not found"
}
```

---

### 3. Search for Song on Genius
**Endpoint:** `GET /api/lyrics/search`

**Description:** Search for a song on Genius to get metadata.

**Parameters:**
- `title` (query parameter) - Song title
- `artist` (query parameter) - Artist name

**Example Request:**
```bash
curl "http://localhost:5000/api/lyrics/search?title=Shape%20of%20You&artist=Ed%20Sheeran"
```

**Example Response:**
```json
{
  "id": 3039923,
  "title": "Shape of You",
  "artist": "Ed Sheeran",
  "albumArt": "https://images.genius.com/...",
  "url": "https://genius.com/Ed-sheeran-shape-of-you-lyrics"
}
```

---

## Source Priority

The API tries sources in this order:

1. **JioSaavn** (if `songId` provided)
   - Best for: Indian, Bollywood, Hindi songs
   - Returns: Clean, formatted lyrics
   - Coverage: High for Indian music

2. **lyrics.ovh**
   - Best for: English, International songs
   - Returns: Plain text lyrics
   - Coverage: Good for popular songs

3. **Genius** (requires API key)
   - Best for: Metadata and song info
   - Returns: URL to lyrics page (not actual lyrics)
   - Coverage: Extensive database

---

## Integration Examples

### Frontend Integration (React/Next.js)

```javascript
// Fetch lyrics with JioSaavn song ID
async function fetchLyrics(songId, artist, title) {
  try {
    // Try with songId first
    const response = await fetch(
      `/api/lyrics/${encodeURIComponent(artist)}/${encodeURIComponent(title)}?songId=${songId}`
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.lyrics;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch lyrics:', error);
    return null;
  }
}

// Usage
const lyrics = await fetchLyrics('K8GXHF5k', 'Arijit Singh', 'Channa Mereya');
```

### Direct JioSaavn Fetch

```javascript
async function fetchJioSaavnLyrics(songId) {
  try {
    const response = await fetch(`/api/lyrics/jiosaavn/${songId}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.lyrics;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch JioSaavn lyrics:', error);
    return null;
  }
}
```

---

## Environment Variables

Add to your `.env` file:

```env
# Optional: Genius API key for fallback
GENIUS_API_KEY=your_genius_api_key_here
```

**Note:** Genius API key is optional. The API will work without it using JioSaavn and lyrics.ovh.

---

## Response Format

### Synced Lyrics Format
```json
{
  "lyrics": [
    {
      "time": 0,      // Time in seconds
      "text": "..."   // Lyric line
    }
  ],
  "synced": false,    // Currently always false (approximate timing)
  "source": "jiosaavn" // Source: "jiosaavn", "lyrics.ovh", or "genius"
}
```

**Note:** The `time` field is currently approximate (3 seconds per line). True synchronized lyrics would require a different data source.

---

## Testing

Test the endpoints using curl:

```bash
# Test JioSaavn endpoint
curl http://localhost:5000/api/lyrics/jiosaavn/K8GXHF5k

# Test multi-source endpoint
curl "http://localhost:5000/api/lyrics/Arijit%20Singh/Channa%20Mereya?songId=K8GXHF5k"

# Test English song (will use lyrics.ovh)
curl "http://localhost:5000/api/lyrics/Ed%20Sheeran/Shape%20of%20You"
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing parameters)
- `404` - Lyrics not found
- `500` - Server error

Always check the response status before parsing the JSON.
