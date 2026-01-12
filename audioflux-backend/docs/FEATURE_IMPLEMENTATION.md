# 🎵 AudioFlux Frontend Feature Implementation Guide

## 1️⃣ Lyrics with Flip Animation

### Backend Setup (Already Created)
- ✅ `services/lyricsService.js` - Lyrics fetching service
- ✅ `routes/lyrics.js` - API endpoints
- 📝 Add to `server.js`: `app.use('/api/lyrics', require('./routes/lyrics'));`
- 📝 Add to `.env`: `GENIUS_API_KEY=your_genius_api_key_here`

### Frontend Implementation

#### Step 1: Create Lyrics Component
**File:** `components/LyricsDisplay.tsx`

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface LyricsLine {
  time: number;
  text: string;
}

interface LyricsDisplayProps {
  artist: string;
  title: string;
  currentTime: number;
  isFlipped: boolean;
}

export default function LyricsDisplay({ 
  artist, 
  title, 
  currentTime,
  isFlipped 
}: LyricsDisplayProps) {
  const [lyrics, setLyrics] = useState<LyricsLine[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const lyricsRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics
  useEffect(() => {
    if (!isFlipped) return;
    
    fetch(`/api/lyrics/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`)
      .then(res => res.json())
      .then(data => {
        if (data.lyrics) {
          setLyrics(data.lyrics);
        }
      })
      .catch(err => console.error('Failed to fetch lyrics:', err));
  }, [artist, title, isFlipped]);

  // Update current line based on time
  useEffect(() => {
    if (!lyrics.length) return;

    const index = lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });

    if (index !== -1 && index !== currentLine) {
      setCurrentLine(index);
      
      // Auto-scroll to current line
      if (lyricsRef.current) {
        const lineElement = lyricsRef.current.children[index] as HTMLElement;
        if (lineElement) {
          lineElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }
  }, [currentTime, lyrics]);

  if (!lyrics.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Loading lyrics...</p>
      </div>
    );
  }

  return (
    <div 
      ref={lyricsRef}
      className="h-full overflow-y-auto px-6 py-4 scrollbar-hide"
    >
      {lyrics.map((line, index) => (
        <motion.p
          key={index}
          className={`
            text-center py-2 transition-all duration-300
            ${index === currentLine 
              ? 'text-white text-xl font-semibold scale-110' 
              : 'text-gray-400 text-base'
            }
          `}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {line.text}
        </motion.p>
      ))}
    </div>
  );
}
```

#### Step 2: Add Flip Animation to Album Art
**File:** `components/AlbumArtFlip.tsx`

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import LyricsDisplay from './LyricsDisplay';

interface AlbumArtFlipProps {
  albumArt: string;
  artist: string;
  title: string;
  currentTime: number;
}

export default function AlbumArtFlip({ 
  albumArt, 
  artist, 
  title, 
  currentTime 
}: AlbumArtFlipProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="relative w-full aspect-square perspective-1000">
      <motion.div
        className="relative w-full h-full cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front - Album Art */}
        <div 
          className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-2xl"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <Image
            src={albumArt}
            alt={title}
            fill
            className="object-cover"
          />
          <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        {/* Back - Lyrics */}
        <div 
          className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <LyricsDisplay
            artist={artist}
            title={title}
            currentTime={currentTime}
            isFlipped={isFlipped}
          />
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

#### Step 3: Add to Tailwind Config
**File:** `tailwind.config.ts`

```typescript
module.exports = {
  theme: {
    extend: {
      perspective: {
        '1000': '1000px',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
  ],
}
```

---

## 2️⃣ User Listening Statistics

### Backend API (Create this)
**File:** `routes/userStats.js`

```javascript
const express = require('express');
const router = express.Router();
const { client } = require('../redis');

/**
 * GET /api/stats/user/:userId
 * Get user listening statistics
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { period = 'all' } = req.query; // all, week, month

        // Get user's play history
        const playHistory = await client.lRange(`user:${userId}:history`, 0, -1);
        
        if (!playHistory || playHistory.length === 0) {
            return res.json({
                totalPlays: 0,
                topSongs: [],
                topArtists: [],
                topGenres: [],
                listeningTime: 0
            });
        }

        // Parse history
        const plays = playHistory.map(p => JSON.parse(p));
        
        // Filter by period
        const now = Date.now();
        const filtered = plays.filter(play => {
            if (period === 'week') return now - play.timestamp < 7 * 24 * 60 * 60 * 1000;
            if (period === 'month') return now - play.timestamp < 30 * 24 * 60 * 60 * 1000;
            return true;
        });

        // Calculate stats
        const songCounts = {};
        const artistCounts = {};
        let totalDuration = 0;

        filtered.forEach(play => {
            // Count songs
            const songKey = `${play.title}-${play.artist}`;
            songCounts[songKey] = (songCounts[songKey] || 0) + 1;
            
            // Count artists
            artistCounts[play.artist] = (artistCounts[play.artist] || 0) + 1;
            
            // Total duration
            totalDuration += play.duration || 0;
        });

        // Top songs
        const topSongs = Object.entries(songCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([song, count]) => {
                const [title, artist] = song.split('-');
                return { title, artist, plays: count };
            });

        // Top artists
        const topArtists = Object.entries(artistCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([artist, count]) => ({ artist, plays: count }));

        res.json({
            totalPlays: filtered.length,
            topSongs,
            topArtists,
            topGenres: [], // Implement genre tracking
            listeningTime: Math.floor(totalDuration / 60), // in minutes
            period
        });
    } catch (error) {
        console.error('[Stats] Error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
```

### Frontend Component
**File:** `components/UserStats.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface UserStatsProps {
  userId: string;
}

export default function UserStats({ userId }: UserStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    fetch(`/api/stats/user/${userId}?period=${period}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to fetch stats:', err));
  }, [userId, period]);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {['all', 'month', 'week'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg ${
              period === p 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total Plays" 
          value={stats.totalPlays.toLocaleString()} 
          icon="🎵"
        />
        <StatCard 
          label="Listening Time" 
          value={`${stats.listeningTime} min`} 
          icon="⏱️"
        />
        <StatCard 
          label="Top Songs" 
          value={stats.topSongs.length} 
          icon="🎶"
        />
        <StatCard 
          label="Top Artists" 
          value={stats.topArtists.length} 
          icon="🎤"
        />
      </div>

      {/* Top Songs */}
      <div>
        <h3 className="text-xl font-bold mb-4">Top Songs</h3>
        <div className="space-y-2">
          {stats.topSongs.map((song: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
            >
              <div>
                <p className="font-semibold">{song.title}</p>
                <p className="text-sm text-gray-400">{song.artist}</p>
              </div>
              <span className="text-purple-400">{song.plays} plays</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-4 rounded-xl">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}
```

---

## 3️⃣ Christmas Winter Visualizer

### Frontend Implementation
**File:** `components/ChristmasVisualizer.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';

interface VisualizerProps {
  audioElement: HTMLAudioElement | null;
}

export default function ChristmasVisualizer({ audioElement }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = 400;

    // Audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Snowflakes
    const snowflakes: any[] = [];
    for (let i = 0; i < 100; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 3 + 1,
        speed: Math.random() * 1 + 0.5,
        drift: Math.random() * 0.5 - 0.25
      });
    }

    function draw() {
      analyser.getByteFrequencyData(dataArray);

      // Clear with dark blue gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw spectrum bars with Christmas colors
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        // Alternate between red and green
        const hue = i % 2 === 0 ? 0 : 120; // Red or Green
        ctx.fillStyle = `hsl(${hue}, 70%, ${50 + (dataArray[i] / 255) * 30}%)`;
        
        ctx.fillRect(
          x,
          canvas.height - barHeight,
          barWidth - 2,
          barHeight
        );

        x += barWidth;
      }

      // Draw snowflakes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      snowflakes.forEach(flake => {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();

        // Update position
        flake.y += flake.speed;
        flake.x += flake.drift;

        // Reset if out of bounds
        if (flake.y > canvas.height) {
          flake.y = -10;
          flake.x = Math.random() * canvas.width;
        }
      });

      // Add sparkles on high frequencies
      const avgFreq = dataArray.reduce((a, b) => a + b) / bufferLength;
      if (avgFreq > 100) {
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = `rgba(255, 215, 0, ${Math.random()})`;
          ctx.beginPath();
          ctx.arc(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 3,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      analyser.disconnect();
    };
  }, [audioElement]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-xl"
    />
  );
}
```

---

## 📦 Installation Steps

### Backend
```bash
cd Backend
npm install axios
```

Add to `.env`:
```
GENIUS_API_KEY=your_genius_api_key_here
```

Add to `server.js`:
```javascript
app.use('/api/lyrics', require('./routes/lyrics'));
app.use('/api/stats', require('./routes/userStats'));
```

### Frontend
```bash
cd audioflux-fe
npm install framer-motion tailwind-scrollbar-hide
```

---

## 🎯 Usage

### 1. Lyrics
```typescript
<AlbumArtFlip
  albumArt={currentSong.image}
  artist={currentSong.artist}
  title={currentSong.title}
  currentTime={audioRef.current?.currentTime || 0}
/>
```

### 2. Stats
```typescript
<UserStats userId={user.id} />
```

### 3. Visualizer
```typescript
<ChristmasVisualizer audioElement={audioRef.current} />
```

---

## 🎨 Customization

- **Lyrics**: Adjust colors, fonts, scroll speed
- **Stats**: Add more metrics, charts
- **Visualizer**: Change colors, add more effects (stars, trees, lights)

All features are modular and can be customized!
