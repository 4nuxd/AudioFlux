/**
 * Premium Thumbnail Generator for AudioFlux
 * Creates beautiful music player thumbnails with sponsor banners
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ThumbnailService {
    constructor() {
        // Use /tmp for thumbnails (writable by non-root user in Docker)
        this.thumbnailDir = path.join('/tmp', 'thumbnails');
        this.ensureThumbnailDir();
    }

    ensureThumbnailDir() {
        if (!fs.existsSync(this.thumbnailDir)) {
            fs.mkdirSync(this.thumbnailDir, { recursive: true });
        }
    }

    /**
     * Create premium thumbnail with sponsor banners
     * @param {string} albumArtUrl - URL of album artwork
     * @param {string} title - Song title
     * @param {string} artist - Artist name
     * @param {number} duration - Duration in seconds
     * @returns {Promise<string>} Path to generated thumbnail
     */
    async createThumbnail(albumArtUrl, title, artist, duration = 0) {
        try {
            // Sanitize inputs
            title = String(title || 'Unknown Title').substring(0, 80);
            artist = String(artist || 'Unknown Artist').substring(0, 60);
            const durationStr = this.formatDuration(duration);

            // Download album art
            const albumArt = await this.downloadImage(albumArtUrl);
            if (!albumArt) {
                console.error('[ThumbnailService] Failed to download album art');
                return null;
            }

            // Random design (1-3)
            const design = Math.floor(Math.random() * 3) + 1;

            let thumbnailPath;
            if (design === 1) {
                thumbnailPath = await this.createPremiumBlue(albumArt, title, artist, durationStr);
            } else if (design === 2) {
                thumbnailPath = await this.createPremiumDark(albumArt, title, artist, durationStr);
            } else {
                thumbnailPath = await this.createPremiumGradient(albumArt, title, artist, durationStr);
            }

            return thumbnailPath;

        } catch (error) {
            console.error('[ThumbnailService] Error creating thumbnail:', error);
            return null;
        }
    }

    /**
     * Download image from URL
     */
    async downloadImage(url) {
        try {
            if (!url || !url.startsWith('http')) {
                return null;
            }

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (response.status !== 200) {
                return null;
            }

            return await loadImage(Buffer.from(response.data));

        } catch (error) {
            console.error('[ThumbnailService] Error downloading image:', error.message);
            return null;
        }
    }

    /**
     * Premium Blue Design
     */
    async createPremiumBlue(albumArt, title, artist, duration) {
        const width = 1280;
        const height = 720;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Blurred background
        ctx.filter = 'blur(80px) brightness(0.4)';
        ctx.drawImage(albumArt, 0, 0, width, height);
        ctx.filter = 'none';

        // Blue gradient overlay
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(50, 60, 120, 0.6)');
        gradient.addColorStop(1, 'rgba(80, 100, 180, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Glass card
        const cardX = 240, cardY = 100, cardW = 800, cardH = 520;
        this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 40, 'rgba(255, 255, 255, 0.1)');
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Album art
        const artSize = 320;
        const artX = cardX + 60;
        const artY = cardY + (cardH - artSize) / 2;
        this.drawRoundedImage(ctx, albumArt, artX, artY, artSize, artSize, 25);

        // Text
        const textX = artX + artSize + 50;
        let textY = cardY + 100;

        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 42px Arial';
        const titleLines = this.wrapText(ctx, title, 30);
        for (let i = 0; i < Math.min(titleLines.length, 2); i++) {
            ctx.fillText(titleLines[i], textX, textY);
            textY += 50;
        }

        // Artist
        textY += 15;
        ctx.fillStyle = '#DCDCDC';
        ctx.font = '30px Arial';
        const artistLines = this.wrapText(ctx, artist, 35);
        ctx.fillText(artistLines[0], textX, textY);

        // Progress bar
        textY += 70;
        this.drawProgressBar(ctx, textX, textY, 350, duration);

        // Control buttons
        textY += 85;
        this.drawControls(ctx, textX + 175, textY, 'blue');

        // Sponsor banners
        this.drawSponsorBanners(ctx, width, height);

        return this.saveCanvas(canvas, title, 1);
    }

    /**
     * Premium Dark Design
     */
    async createPremiumDark(albumArt, title, artist, duration) {
        const width = 1280;
        const height = 720;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Dark blurred background
        ctx.filter = 'blur(70px) brightness(0.25)';
        ctx.drawImage(albumArt, 0, 0, width, height);
        ctx.filter = 'none';

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, width, height);

        // Circular album art
        const artSize = 380;
        const artX = 180;
        const artY = (height - artSize) / 2;

        // White border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(artX + artSize / 2, artY + artSize / 2, artSize / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();

        // Circular album art
        ctx.save();
        ctx.beginPath();
        ctx.arc(artX + artSize / 2, artY + artSize / 2, artSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(albumArt, artX, artY, artSize, artSize);
        ctx.restore();

        // Text
        const textX = artX + artSize + 80;
        let textY = 200;

        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px Arial';
        const titleLines = this.wrapText(ctx, title, 35);
        for (let i = 0; i < Math.min(titleLines.length, 2); i++) {
            ctx.fillText(titleLines[i], textX, textY);
            textY += 60;
        }

        // Artist
        textY += 20;
        ctx.fillStyle = '#C8C8C8';
        ctx.font = '30px Arial';
        const artistLines = this.wrapText(ctx, artist, 40);
        ctx.fillText(artistLines[0] + ' | 63M views', textX, textY);

        // Progress bar
        textY += 65;
        this.drawProgressBar(ctx, textX, textY, 450, duration, '#FF8C00');

        // Control buttons
        textY += 75;
        this.drawControls(ctx, textX + 150, textY, 'dark');

        // Sponsor banners
        this.drawSponsorBanners(ctx, width, height);

        return this.saveCanvas(canvas, title, 2);
    }

    /**
     * Premium Gradient Design
     */
    async createPremiumGradient(albumArt, title, artist, duration) {
        const width = 1280;
        const height = 720;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Blurred background
        ctx.filter = 'blur(75px) brightness(0.35)';
        ctx.drawImage(albumArt, 0, 0, width, height);
        ctx.filter = 'none';

        // Dark gradient overlay
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(60, 60, 60, 0.7)');
        gradient.addColorStop(1, 'rgba(20, 20, 20, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Glass card
        const cardX = 245, cardY = 105, cardW = 790, cardH = 510;
        this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 35, 'rgba(80, 80, 80, 0.4)');
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Album art
        const artSize = 300;
        const artX = cardX + 55;
        const artY = cardY + (cardH - artSize) / 2;
        this.drawRoundedImage(ctx, albumArt, artX, artY, artSize, artSize, 20);

        // Text
        const textX = artX + artSize + 50;
        let textY = cardY + 95;

        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 42px Arial';
        const titleLines = this.wrapText(ctx, title, 28);
        for (let i = 0; i < Math.min(titleLines.length, 2); i++) {
            ctx.fillText(titleLines[i], textX, textY);
            textY += 50;
        }

        // Artist
        textY += 15;
        ctx.fillStyle = '#D2D2D2';
        ctx.font = '30px Arial';
        const artistLines = this.wrapText(ctx, artist, 32);
        ctx.fillText(artistLines[0], textX, textY);

        // Progress bar
        textY += 65;
        this.drawProgressBar(ctx, textX, textY, 380, duration);

        // Control buttons
        textY += 68;
        this.drawControls(ctx, textX + 190, textY, 'gradient');

        // Sponsor banners
        this.drawSponsorBanners(ctx, width, height);

        return this.saveCanvas(canvas, title, 3);
    }

    /**
     * Draw sponsor banners
     */
    drawSponsorBanners(ctx, width, height) {
        // Left top: Sponsor - @USDTOutlet
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.drawRoundedRect(ctx, 20, 20, 280, 50, 25, 'rgba(0, 0, 0, 0.7)');
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('Sponsor - @USDTOutlet', 40, 52);

        // Right top: AudioFlux
        const rightBannerX = width - 200;
        this.drawRoundedRect(ctx, rightBannerX, 20, 180, 50, 25, 'rgba(100, 50, 200, 0.8)');
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('AudioFlux', rightBannerX + 30, 52);
    }

    /**
     * Draw rounded rectangle
     */
    drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
    }

    /**
     * Draw rounded image
     */
    drawRoundedImage(ctx, image, x, y, width, height, radius) {
        ctx.save();
        this.drawRoundedRect(ctx, x, y, width, height, radius);
        ctx.clip();
        ctx.drawImage(image, x, y, width, height);
        ctx.restore();
    }

    /**
     * Draw progress bar
     */
    drawProgressBar(ctx, x, y, width, duration, color = '#FFFFFF') {
        const barHeight = 5;

        // Background
        this.drawRoundedRect(ctx, x, y, width, barHeight, 3, 'rgba(255, 255, 255, 0.3)');
        ctx.fill();

        // Progress (30%)
        const progressWidth = width * 0.3;
        this.drawRoundedRect(ctx, x, y, progressWidth, barHeight, 3, color);
        ctx.fill();

        // Time labels
        ctx.fillStyle = '#C8C8C8';
        ctx.font = '22px Arial';
        ctx.fillText('0:24', x, y + 25);
        ctx.fillText(duration, x + width - 40, y + 25);
    }

    /**
     * Draw control buttons
     */
    drawControls(ctx, centerX, centerY, theme) {
        // Play button (center, large)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.fill();

        // Play triangle
        ctx.fillStyle = theme === 'gradient' ? '#282828' : '#323232';
        ctx.beginPath();
        ctx.moveTo(centerX - 8, centerY - 12);
        ctx.lineTo(centerX - 8, centerY + 12);
        ctx.lineTo(centerX + 12, centerY);
        ctx.closePath();
        ctx.fill();

        // Previous button (left)
        ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
        ctx.beginPath();
        ctx.arc(centerX - 90, centerY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Next button (right)
        ctx.beginPath();
        ctx.arc(centerX + 90, centerY, 18, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Wrap text to fit width
     */
    wrapText(ctx, text, maxChars) {
        if (!text || text.length <= maxChars) {
            return [text];
        }

        const words = text.split(' ');
        const lines = [];
        let current = [];

        for (const word of words) {
            const test = [...current, word].join(' ');
            if (test.length <= maxChars) {
                current.push(word);
            } else {
                if (current.length > 0) {
                    lines.push(current.join(' '));
                }
                current = [word.substring(0, maxChars)];
            }
        }

        if (current.length > 0) {
            lines.push(current.join(' '));
        }

        return lines.slice(0, 2);
    }

    /**
     * Format duration to MM:SS
     */
    formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Save canvas to file
     */
    saveCanvas(canvas, title, designNum) {
        const safeName = title.replace(/[^a-zA-Z0-9-_ ]/g, '').substring(0, 30);
        const filename = `${safeName}_premium_${designNum}.jpg`;
        const filepath = path.join(this.thumbnailDir, filename);

        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
        fs.writeFileSync(filepath, buffer);

        console.log('[ThumbnailService] Thumbnail created:', filepath);
        return filepath;
    }
}

module.exports = new ThumbnailService();
