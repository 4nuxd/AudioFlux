'use client'

import { useEffect, useRef, useState } from 'react'

interface Snowflake {
    x: number
    y: number
    radius: number
    speed: number
    drift: number
    opacity: number
    layer: number
}

interface Star {
    x: number
    y: number
    size: number
    twinkleSpeed: number
    brightness: number
}

interface IceCrystal {
    x: number
    y: number
    size: number
    rotation: number
    rotationSpeed: number
    opacity: number
}

interface WindGust {
    x: number
    y: number
    speed: number
    opacity: number
    active: boolean
}

interface WinterOverlayProps {
    enabled?: boolean
}

export default function WinterOverlay({ enabled = true }: WinterOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const snowflakesRef = useRef<Snowflake[]>([])
    const starsRef = useRef<Star[]>([])
    const iceCrystalsRef = useRef<IceCrystal[]>([])
    const windGustsRef = useRef<WindGust[]>([])
    const animationRef = useRef<number>()
    const [winterEnabled, setWinterEnabled] = useState(enabled)
    const lastGustTimeRef = useRef<number>(0)

    useEffect(() => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        fetch(`${API_URL}/api/winter-mode`)
            .then(res => res.json())
            .then(data => {
                if (data.enabled !== undefined) {
                    setWinterEnabled(data.enabled)
                }
            })
            .catch(() => setWinterEnabled(enabled))

        const interval = setInterval(() => {
            fetch(`${API_URL}/api/winter-mode`)
                .then(res => res.json())
                .then(data => {
                    if (data.enabled !== undefined) {
                        setWinterEnabled(data.enabled)
                    }
                })
                .catch(() => { })
        }, 30000)

        return () => clearInterval(interval)
    }, [enabled])

    useEffect(() => {
        if (!winterEnabled) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        // Multi-layered snowfall
        const initSnowflakes = () => {
            snowflakesRef.current = []
            const snowflakeCount = Math.min(200, Math.floor((canvas.width * canvas.height) / 6000))

            for (let i = 0; i < snowflakeCount; i++) {
                const layer = Math.random() < 0.3 ? 1 : (Math.random() < 0.6 ? 2 : 3)
                snowflakesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: layer === 1 ? Math.random() * 2 + 1 : (layer === 2 ? Math.random() * 3 + 2 : Math.random() * 4 + 3),
                    speed: layer === 1 ? Math.random() * 0.8 + 0.3 : (layer === 2 ? Math.random() * 1.2 + 0.6 : Math.random() * 1.8 + 1),
                    drift: Math.random() * 0.6 - 0.3,
                    opacity: layer === 1 ? Math.random() * 0.3 + 0.2 : (layer === 2 ? Math.random() * 0.4 + 0.3 : Math.random() * 0.5 + 0.4),
                    layer
                })
            }
        }
        initSnowflakes()

        const initStars = () => {
            starsRef.current = []
            const starCount = 70

            for (let i = 0; i < starCount; i++) {
                starsRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * (canvas.height * 0.35),
                    size: Math.random() * 2 + 0.5,
                    twinkleSpeed: Math.random() * 0.03 + 0.01,
                    brightness: Math.random()
                })
            }
        }
        initStars()

        const initIceCrystals = () => {
            iceCrystalsRef.current = []
            const crystalCount = 30

            for (let i = 0; i < crystalCount; i++) {
                iceCrystalsRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 3 + 2,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.02,
                    opacity: Math.random() * 0.4 + 0.2
                })
            }
        }
        initIceCrystals()

        const initWindGusts = () => {
            windGustsRef.current = []
            for (let i = 0; i < 5; i++) {
                windGustsRef.current.push({
                    x: -100,
                    y: Math.random() * canvas.height,
                    speed: Math.random() * 15 + 10,
                    opacity: 0,
                    active: false
                })
            }
        }
        initWindGusts()

        let frameCount = 0

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            frameCount++

            if (frameCount % 120 === 0) {
                ctx.fillStyle = 'rgba(174, 230, 247, 0.02)'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
            }

            starsRef.current.forEach((star: Star) => {
                star.brightness = (Math.sin(frameCount * star.twinkleSpeed) + 1) / 2
                ctx.beginPath()
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(174, 230, 247, ${star.brightness * 0.85})`
                ctx.fill()

                if (star.brightness > 0.75) {
                    ctx.strokeStyle = `rgba(145, 201, 247, ${star.brightness * 0.5})`
                    ctx.lineWidth = 0.8
                    ctx.beginPath()
                    ctx.moveTo(star.x - star.size * 3, star.y)
                    ctx.lineTo(star.x + star.size * 3, star.y)
                    ctx.moveTo(star.x, star.y - star.size * 3)
                    ctx.lineTo(star.x, star.y + star.size * 3)
                    ctx.stroke()
                }
            })

            iceCrystalsRef.current.forEach((crystal: IceCrystal) => {
                crystal.rotation += crystal.rotationSpeed
                crystal.y -= 0.3

                if (crystal.y < -10) {
                    crystal.y = canvas.height + 10
                    crystal.x = Math.random() * canvas.width
                }

                ctx.save()
                ctx.translate(crystal.x, crystal.y)
                ctx.rotate(crystal.rotation)

                ctx.beginPath()
                ctx.moveTo(0, -crystal.size)
                ctx.lineTo(crystal.size * 0.6, 0)
                ctx.lineTo(0, crystal.size)
                ctx.lineTo(-crystal.size * 0.6, 0)
                ctx.closePath()

                ctx.fillStyle = `rgba(174, 230, 247, ${crystal.opacity})`
                ctx.fill()
                ctx.strokeStyle = `rgba(145, 201, 247, ${crystal.opacity * 0.8})`
                ctx.lineWidth = 0.5
                ctx.stroke()

                ctx.restore()
            })

            snowflakesRef.current.forEach((flake: Snowflake) => {
                ctx.beginPath()
                ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2)

                const blueShade = flake.layer === 1 ? 'rgba(246, 249, 252, ' : (flake.layer === 2 ? 'rgba(240, 248, 255, ' : 'rgba(218, 228, 236, ')
                ctx.fillStyle = blueShade + flake.opacity + ')'
                ctx.fill()

                if (flake.radius > 2.5) {
                    ctx.shadowBlur = 10
                    ctx.shadowColor = `rgba(174, 230, 247, ${flake.opacity * 0.5})`
                    ctx.fill()
                    ctx.shadowBlur = 0
                }

                flake.y += flake.speed
                flake.x += flake.drift + Math.sin(frameCount * 0.006) * 0.3

                if (flake.y > canvas.height) {
                    flake.y = -10
                    flake.x = Math.random() * canvas.width
                }
                if (flake.x > canvas.width) flake.x = 0
                else if (flake.x < 0) flake.x = canvas.width
            })

            const now = Date.now()
            if (now - lastGustTimeRef.current > 18000 + Math.random() * 12000) {
                const gust = windGustsRef.current.find((g: WindGust) => !g.active)
                if (gust) {
                    gust.active = true
                    gust.x = -100
                    gust.y = Math.random() * canvas.height
                    gust.opacity = 0.6
                    lastGustTimeRef.current = now
                }
            }

            windGustsRef.current.forEach((gust: WindGust) => {
                if (!gust.active) return

                gust.x += gust.speed
                gust.opacity -= 0.008

                ctx.beginPath()
                ctx.moveTo(gust.x, gust.y)
                ctx.lineTo(gust.x - 80, gust.y + 20)
                ctx.strokeStyle = `rgba(174, 230, 247, ${gust.opacity})`
                ctx.lineWidth = 2
                ctx.stroke()

                if (gust.x > canvas.width + 100 || gust.opacity <= 0) {
                    gust.active = false
                }
            })

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [winterEnabled])

    if (!winterEnabled) return null

    return (
        <>
            <canvas
                ref={canvasRef}
                className="fixed inset-0 pointer-events-none z-50"
                style={{ mixBlendMode: 'screen' }}
            />

            <style jsx global>{`
                /* ❄️ WINTER MODE UI ENHANCEMENTS ❄️ */
                
                /* 1️⃣ Frosted Corners on Main Player Card */
                .glass-card,
                .glass-panel {
                    position: relative;
                }
                
                .glass-card::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 2px;
                    background: linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.4) 0%,
                        rgba(174, 230, 247, 0.2) 25%,
                        transparent 50%,
                        rgba(174, 230, 247, 0.2) 75%,
                        rgba(255, 255, 255, 0.4) 100%
                    );
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    pointer-events: none;
                    opacity: 0.6;
                }

                /* 2️⃣ Ice Gradient Progress Bar */
                [role="progressbar"],
                .progress-bar,
                input[type="range"]::-webkit-slider-thumb {
                    background: linear-gradient(90deg, 
                        #91C9F7 0%, 
                        #F6F9FC 50%, 
                        #AEE6F7 100%
                    ) !important;
                    box-shadow: 0 0 10px rgba(174, 230, 247, 0.5);
                }

                input[type="range"]::-moz-range-thumb {
                    background: linear-gradient(90deg, 
                        #91C9F7 0%, 
                        #F6F9FC 50%, 
                        #AEE6F7 100%
                    ) !important;
                    box-shadow: 0 0 10px rgba(174, 230, 247, 0.5);
                }

                /* 3️⃣ Snow Glow Around Album Art */
                img[alt*="album"],
                img[alt*="thumbnail"],
                .album-art,
                [class*="album"] img {
                    box-shadow: 
                        0 0 20px rgba(174, 230, 247, 0.25),
                        0 0 40px rgba(145, 201, 247, 0.15),
                        0 8px 32px rgba(0, 0, 0, 0.1) !important;
                    border: 2px solid rgba(174, 230, 247, 0.3) !important;
                }

                /* 4️⃣ Freeze Animation on Buttons */
                @keyframes ice-crack {
                    0% {
                        box-shadow: 
                            0 0 0 0 rgba(174, 230, 247, 0.7),
                            inset 0 0 0 0 rgba(255, 255, 255, 0);
                    }
                    50% {
                        box-shadow: 
                            0 0 20px 10px rgba(174, 230, 247, 0.3),
                            inset 0 0 20px 5px rgba(255, 255, 255, 0.5);
                    }
                    100% {
                        box-shadow: 
                            0 0 0 0 rgba(174, 230, 247, 0),
                            inset 0 0 0 0 rgba(255, 255, 255, 0);
                    }
                }

                button:active,
                [role="button"]:active {
                    animation: ice-crack 120ms ease-out;
                }

                /* 5️⃣ Winter Icons Variant (Frost Edges) */
                button svg,
                [role="button"] svg,
                .icon {
                    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.6))
                            drop-shadow(0 0 4px rgba(174, 230, 247, 0.4));
                    transition: filter 0.2s ease;
                }

                button:hover svg,
                [role="button"]:hover svg {
                    filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))
                            drop-shadow(0 0 6px rgba(174, 230, 247, 0.6))
                            drop-shadow(0 0 10px rgba(145, 201, 247, 0.4));
                }

                /* 6️⃣ Crystalline Blur Behind Bottom Navbar */
                nav,
                [role="navigation"],
                .bottom-nav,
                footer {
                    backdrop-filter: blur(12px) saturate(180%) !important;
                    -webkit-backdrop-filter: blur(12px) saturate(180%) !important;
                    background: linear-gradient(180deg,
                        rgba(255, 255, 255, 0.12) 0%,
                        rgba(246, 249, 252, 0.15) 100%
                    ) !important;
                    border-top: 1px solid rgba(255, 255, 255, 0.26) !important;
                    box-shadow: 
                        0 -4px 20px rgba(174, 230, 247, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3);
                }

                /* 7️⃣ "Frozen Tabs" Active Indicator */
                [aria-selected="true"],
                .active,
                [data-state="active"],
                button[aria-current="page"] {
                    color: #AEE6F7 !important;
                    box-shadow: 
                        0 0 10px rgba(174, 230, 247, 0.6),
                        0 0 20px rgba(145, 201, 247, 0.3),
                        inset 0 0 10px rgba(174, 230, 247, 0.2) !important;
                    background: linear-gradient(135deg,
                        rgba(174, 230, 247, 0.15) 0%,
                        rgba(145, 201, 247, 0.1) 100%
                    ) !important;
                    border: 1px solid rgba(174, 230, 247, 0.4) !important;
                }

                /* 8️⃣ Icy Tooltip / Toast Style */
                [role="alert"],
                [role="status"],
                .toast,
                .tooltip {
                    background: linear-gradient(135deg,
                        rgba(246, 249, 252, 0.95) 0%,
                        rgba(240, 248, 255, 0.92) 100%
                    ) !important;
                    backdrop-filter: blur(16px) saturate(180%) !important;
                    border: 1px solid rgba(174, 230, 247, 0.5) !important;
                    box-shadow: 
                        0 0 20px rgba(174, 230, 247, 0.4),
                        0 8px 32px rgba(145, 201, 247, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
                    color: #0B1E3C !important;
                }

                /* 9️⃣ Soft Winter Spotlight Behind UI */
                body::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background: radial-gradient(
                        ellipse at center,
                        rgba(174, 230, 247, 0.15) 0%,
                        rgba(145, 201, 247, 0.08) 40%,
                        transparent 70%
                    );
                    pointer-events: none;
                    z-index: 0;
                }

                /* 🔟 Frozen Button States */
                button,
                [role="button"] {
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* Idle: soft icy glow */
                button:not(:disabled),
                [role="button"]:not([aria-disabled="true"]) {
                    box-shadow: 
                        0 2px 8px rgba(174, 230, 247, 0.15),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3);
                }

                /* Hover: stronger glow */
                button:hover:not(:disabled),
                [role="button"]:hover:not([aria-disabled="true"]) {
                    box-shadow: 
                        0 0 20px rgba(174, 230, 247, 0.4),
                        0 0 40px rgba(145, 201, 247, 0.2),
                        0 4px 16px rgba(174, 230, 247, 0.25),
                        inset 0 1px 0 rgba(255, 255, 255, 0.5);
                    transform: translateY(-1px);
                }

                /* Active: frosty burst ripple */
                @keyframes frosty-ripple {
                    0% {
                        box-shadow: 
                            0 0 0 0 rgba(174, 230, 247, 0.8),
                            inset 0 0 0 0 rgba(255, 255, 255, 0);
                    }
                    50% {
                        box-shadow: 
                            0 0 0 20px rgba(174, 230, 247, 0),
                            inset 0 0 30px 10px rgba(255, 255, 255, 0.6);
                    }
                    100% {
                        box-shadow: 
                            0 0 0 40px rgba(174, 230, 247, 0),
                            inset 0 0 0 0 rgba(255, 255, 255, 0);
                    }
                }

                button:active:not(:disabled),
                [role="button"]:active:not([aria-disabled="true"]) {
                    animation: frosty-ripple 0.6s ease-out;
                    transform: translateY(0);
                }

                /* ✨ Crystal Shine Animation */
                @keyframes crystal-shine {
                    0%, 100% { background-position: -200% center; }
                    50% { background-position: 200% center; }
                }

                .glass-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(174, 230, 247, 0.15) 50%,
                        transparent 100%
                    );
                    background-size: 200% 100%;
                    animation: crystal-shine 8s ease-in-out infinite;
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 1;
                }

                /* Frosted Panel Top Edge */
                .glass-panel::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(174, 230, 247, 0.4),
                        transparent
                    );
                    pointer-events: none;
                }

                /* Winter Hover Glow for Interactive Elements */
                a:hover,
                button:hover,
                .glass:hover,
                .glass-card:hover {
                    box-shadow: 
                        0 0 20px rgba(174, 230, 247, 0.3),
                        0 0 40px rgba(145, 201, 247, 0.2),
                        inset 0 0 20px rgba(174, 230, 247, 0.1) !important;
                }

                /* Smooth transitions for all winter effects */
                * {
                    transition-property: box-shadow, transform, filter, background;
                    transition-duration: 0.3s;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* Preserve existing transitions */
                *[style*="transition"] {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
            `}</style>
        </>
    )
}
