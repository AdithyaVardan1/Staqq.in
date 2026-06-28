# Staqq   Design System

## Brand Identity

**Product:** Staqq   a free investing education and exploration platform for young people worldwide, covering stocks, IPOs, and crypto. The Indian market (IPO GMP, NSE signals) is the starting depth, but the design and copy speak to any young investor globally. Clean, confident, modern. Feels like a terminal but approachable enough for a first-time investor anywhere in the world.

**Tone:** Smart but not intimidating. Data-forward. Dark and premium without being cold. Think Bloomberg Terminal meets a consumer app made for Gen Z. No region-specific jargon in hero sections or global-facing pages. Data pages (IPO, FII/DII) can use Indian market context naturally.

---

## Color Palette

### Primary
| Token | Value | Usage |
|-------|-------|-------|
| Brand / Neon Lime | `#CAFF00` | Primary CTAs, active states, highlights, brand moments |
| Brand Dark | `#A3CC00` | Hover states on brand elements |
| Text on Brand | `#000000` | Text placed on #CAFF00 backgrounds |

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0A0A0A` | Page background, outermost layer |
| Card | `#121212` | Card backgrounds, panels |
| Surface | `#1E1E1E` | Elevated surfaces, modals, dropdowns |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#FFFFFF` | Headings, important labels |
| Secondary | `#A1A1AA` | Body text, descriptions |
| Muted | `#71717A` | Helper text, timestamps, metadata |
| Faint | `#52525B` | Disabled states, placeholders |

### Borders & Glass
| Token | Value | Usage |
|-------|-------|-------|
| Border Default | `rgba(255,255,255,0.07)` | Card borders, dividers |
| Border Hover | `rgba(255,255,255,0.14)` | Hover state borders |
| Border Brand | `rgba(202,255,0,0.25)` | Brand-accented borders |
| Glass BG | `rgba(255,255,255,0.03)` | Glass card fills |

### Status / Semantic
| Token | Value | Usage |
|-------|-------|-------|
| Success / Bullish | `#22C55E` | Positive price change, good signals |
| Danger / Bearish | `#EF4444` | Negative price change, risk flags |
| Warning | `#F59E0B` | Caution states, neutral signals |
| Info | `#3B82F6` | Informational badges |
| Purple | `#A78BFA` | Crypto / wallet features |
| Orange | `#F97316` | New launches, alerts, volume spikes |

---

## Typography

### Font Stack
- **Display / Headings:** Outfit (Google Fonts)   weights 700, 800
- **Body / UI:** Inter (Google Fonts)   weights 400, 500, 600

### Scale
| Role | Size | Weight | Font | Letter Spacing |
|------|------|--------|------|----------------|
| Hero Title | 3.5–4.5rem | 800 | Outfit | -0.03em |
| Page Title | 2–2.5rem | 800 | Outfit | -0.02em |
| Section Title | 1.5rem | 700 | Outfit | -0.02em |
| Card Title | 1rem–1.1rem | 700 | Outfit | -0.01em |
| Body | 0.9rem | 400 | Inter | 0 |
| Small / Meta | 0.75–0.8rem | 500 | Inter | 0 |
| Badge / Label | 0.65–0.72rem | 600 | Inter | 0.04–0.08em |

---

## Spacing

Base unit: `4px`

| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |
| 3xl | 64px |

---

## Layout

- **Max content width:** 1280px, centered
- **Side padding:** 16px mobile, 24px tablet, 32px desktop
- **Section vertical padding:** 64px–80px
- **Card gap:** 12px–16px in grids

---

## Component Patterns

### Cards
```
background: rgba(255,255,255,0.03)
border: 1px solid rgba(255,255,255,0.07)
border-radius: 12px–14px
padding: 16px–24px
transition: border-color 0.15s on hover → rgba(255,255,255,0.14)
```

For brand-accented cards (Pro, featured):
```
border: 1px solid rgba(202,255,0,0.2)
background: rgba(202,255,0,0.03)
```

### Buttons

**Primary (Brand)**
```
background: #CAFF00
color: #000000
border-radius: 8px
padding: 10px 20px
font: 600 0.9rem Inter
hover: background #D4FF26
```

**Secondary / Ghost**
```
background: rgba(255,255,255,0.06)
border: 1px solid rgba(255,255,255,0.1)
color: #E4E4E7
border-radius: 8px
hover: background rgba(255,255,255,0.1)
```

**Danger**
```
background: rgba(239,68,68,0.1)
border: 1px solid rgba(239,68,68,0.2)
color: #EF4444
```

### Badges / Pills
```
border-radius: 999px (pill) or 4px (square)
padding: 2px 8px–10px
font: 600 0.65–0.72rem Inter
letter-spacing: 0.04–0.08em
text-transform: uppercase
```

Brand badge:
```
background: rgba(202,255,0,0.08)
border: 1px solid rgba(202,255,0,0.2)
color: #CAFF00
```

### Data Stats (numbers that matter)
```
font: 700–800 1.5–2rem Outfit
color: #FFFFFF
sub-label: 0.72rem #71717A
positive delta: #22C55E with ▲ or TrendingUp icon
negative delta: #EF4444 with ▼ or TrendingDown icon
```

### Inputs
```
background: rgba(255,255,255,0.04)
border: 1px solid rgba(255,255,255,0.1)
border-radius: 8px
color: #FFFFFF
placeholder: #52525B
padding: 10px 14px
focus border: rgba(202,255,0,0.4)
```

### Navigation Bar
```
background: rgba(10,10,10,0.8)
backdrop-filter: blur(12px)
border-bottom: 1px solid rgba(255,255,255,0.07) on scroll
height: 64px
logo left, nav links center, auth actions right
active link: color #CAFF00
```

### Section Headers
```
eyebrow label: uppercase badge in brand color above the heading
heading: Outfit 800, white
subheading: Inter 400, #A1A1AA, max-width 600px
spacing between: 12px eyebrow→heading, 16px heading→sub
```

---

## Iconography

Library: **Lucide React**
Default size: 16px in UI, 20–24px in headers, 28–32px in feature icons
Color: inherits text color or explicit semantic color
Style: outline (not filled)

---

## Motion & Animation

- Transitions: `0.15s ease` for hover states (color, border, background)
- Transform on hover cards: `translateY(-1px)` subtle lift
- Spinner: `spin 0.8–1s linear infinite`
- Page transitions: none (keep it fast)
- Spring easing for modals/dropdowns: `cubic-bezier(0.175, 0.885, 0.32, 1.275)`

---

## Page-Specific Patterns

### Hero Sections
- Full-width, centered text
- Eyebrow badge → H1 → subtitle → CTA(s)
- Subtle background: either pure `#0A0A0A` or faint radial glow in brand color at 4–6% opacity behind hero text
- CTA stack: primary brand button + secondary ghost button side by side

### Data Tables / Grids
- Row hover: `rgba(255,255,255,0.025)` background
- Header: `#52525B` uppercase 0.65rem
- Alternating subtle: avoid   use hover only
- Sticky header on scroll for long tables

### Score / Rating Display
- Number large (2rem+), colored by threshold
- Label below in matching color, smaller
- Optional ring/arc SVG around the number for visual weight

### Empty States
- Centered, icon at top (40px, 30% opacity)
- H3 white, paragraph secondary
- Optional CTA button

---

## Voice & Copy Style

- Short, direct sentences. No fluff.
- Numbers and data points over adjectives ("127K liquidity" not "substantial liquidity")
- No em dashes ( ). Use periods or commas instead.
- Avoid sounding corporate. Talk like a smart friend who knows markets.
- CTAs: action-first ("Start Free", "View Signals", "Scan Token") not benefit-last ("Click here to get started")

---

## What Staqq Is NOT

- Not a broker. Never say "buy" without a disclaimer.
- Not for professional fund managers. For young, first-time or early-stage retail investors and crypto traders globally.
- Not cluttered. When in doubt, remove. White space is intentional.
- Not light mode. Always dark.
