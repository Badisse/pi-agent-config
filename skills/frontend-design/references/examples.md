# Design Decision Examples

Concrete examples of how to translate a brief into design decisions. Use these as reference for the thinking process, not as templates to copy.

## Example 1: Photographer Portfolio

**Brief**: Portfolio site for a fine-art landscape photographer. Should feel like stepping into a gallery.

**Direction**: Editorial/magazine with luxury undertones

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Display font | Cormorant Garamond (300 weight) | Elegant serif, editorial feel, lets photos be the star |
| Body font | DM Sans | Clean, readable, doesn't compete with display |
| Colors | Off-black (#0a0a0a), warm white (#faf8f5), gold accent (#c9a96e) | Gallery walls + spotlight feel |
| Layout | Asymmetric — large hero image left-aligned, text floats right | Editorial magazine spread |
| Motion | Images fade in on scroll, 600ms ease, 80ms stagger | Mimics walking through a gallery |
| The hook | Full-bleed images that extend to viewport edge | Dramatic, immersive, unforgettable |

## Example 2: Developer CLI Tool Landing Page

**Brief**: Landing page for a terminal-based dev tool. Audience is engineers who appreciate craft.

**Direction**: Brutalist/industrial with retro-terminal undertones

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Display font | JetBrains Mono or IBM Plex Mono | Code-native, authentic to the audience |
| Body font | Space Mono | Monospace family, keeps the terminal feel |
| Colors | CRT green (#00ff41) on near-black (#0d0d0d), amber accent (#ffb000) | Terminal color palette |
| Layout | Dense grid, no rounded corners, hard edges | Brutalist — nothing soft, everything precise |
| Motion | Typing animation for code examples, CRT scanline overlay | Terminal nostalgia |
| The hook | Live-running terminal embedded in the page | Shows the product in its natural habitat |

## Example 3: Children's Learning App

**Brief**: Interactive web app for kids ages 5–8 learning math. Parents also see progress dashboards.

**Direction**: Playful/toy-like with soft warmth

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Display font | Fredoka One | Rounded, bubbly, friendly |
| Body font | Nunito | Soft rounded sans, highly readable at large sizes |
| Colors | Cream (#fef9ef), coral (#ff6b6b), teal (#4ecdc4), sunny yellow (#ffe66d) | Warm, inviting, gender-neutral |
| Layout | Large tap targets, generous spacing, cards with soft shadows and rounded corners | Kid-friendly proportions |
| Motion | Bouncy spring animations on correct answers, wiggle on errors | Positive reinforcement through motion |
| The hook | Animated mascot character that reacts to progress | Emotional connection, memorable |

## Example 4: SaaS Analytics Dashboard Redesign

**Brief**: Redesign an existing dashboard that currently looks like a generic admin template. Data-heavy, professional audience.

**Direction**: Swiss/typographic — precision and clarity as the aesthetic

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Display font | Instrument Sans or Manrope | Geometric, modern, professional without being boring |
| Body font | Same family, lighter weights | Consistency in a data-dense interface |
| Colors | Cool gray hierarchy (#f8f9fa → #212529), single blue accent (#3366ff) | Data should be the color; UI gets out of the way |
| Layout | 12-column grid, strict alignment, clear visual hierarchy | Swiss design discipline |
| Motion | Subtle: 150ms transitions on state changes, no decorative animation | Professional — motion only when functional |
| The hook | Data visualizations that are genuinely beautiful (custom chart styling) | Analytics pages are remembered for their charts, not their navbars |

**Redesign approach**: Incremental — update CSS custom properties first (colors, fonts, spacing), then tackle component-by-component starting with the most visible (sidebar, charts, data tables).

## How to Use These Examples

Don't copy them directly. Instead, follow the pattern:

1. **Read the brief** → understand purpose and audience
2. **Pick a tone** → name it explicitly (the direction name itself is a creative act)
3. **Make 6 decisions**: fonts (2), colors, layout, motion, the hook
4. **Every decision must serve the tone** — if you can't explain why it fits, pick something else
5. **The hook is essential** — what's the one visual element someone screenshots and shares?
