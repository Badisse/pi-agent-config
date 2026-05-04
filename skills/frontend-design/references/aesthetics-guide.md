# Aesthetics Guide

Detailed guidelines for making design choices that avoid generic AI aesthetics.

## Typography

Fonts are the single biggest signal of design intent. Get this right and you're halfway there.

**Approach**: Pair a distinctive display font with a refined body font. The display font carries personality; the body font ensures readability.

**Font selection strategy**:
- Browse Google Fonts, Fontshare, or Adobe Fonts for options
- Choose fonts with character — unusual letterforms, interesting weight ranges, distinctive x-height
- Pair contrasting styles: a geometric display with a humanist body, or a serif display with a sans body
- Test with real content at real sizes, not lorem ipsum

**Anti-patterns — never use**:
- Inter, Roboto, Arial, Helvetica, system-ui as primary identity fonts
- Space Grotesk (overused in AI-generated designs)
- More than 2 font families in one interface
- Font choices disconnected from the aesthetic direction (e.g., a playful font in a brutalist layout)

## Color & Theme

**Build a system, not a palette.** Use CSS custom properties for every color decision.

Structure:
```css
:root {
  /* Base */
  --color-bg: ...;
  --color-surface: ...;
  --color-text: ...;
  --color-text-muted: ...;
  
  /* Accent */
  --color-accent: ...;
  --color-accent-hover: ...;
  
  /* Utility */
  --color-border: ...;
  --color-overlay: ...;
}
```

**Principles**:
- Dominant base color with 1–2 sharp accents outperforms timid, evenly-distributed palettes
- Commit fully: light OR dark, don't hedge with a muddy middle ground
- Test contrast ratios for accessibility (WCAG AA minimum)
- The accent color should appear sparingly — if everything is accented, nothing is

**Anti-patterns**:
- Purple gradients on white backgrounds (the most common AI-generated cliché)
- Evenly distributed rainbow palettes with no hierarchy
- Pure black (#000) on pure white (#fff) — slightly off-black/off-white is more refined
- More than 3 distinct hue families in one design

## Motion & Animation

Motion should feel purposeful, not decorative.

**High-impact moments** (prioritize these):
1. **Page load**: Staggered reveals with `animation-delay` create a choreographed entrance
2. **Scroll triggers**: Elements that reveal as you scroll — IntersectionObserver or CSS `scroll-driven-animations`
3. **Hover states**: Surprising but delightful micro-interactions

**Implementation preferences**:
- CSS-only animations for HTML projects (`@keyframes`, `transition`, `animation-delay`)
- Motion library (framer-motion) for React projects when available
- Always wrap animations in `@media (prefers-reduced-motion: no-preference)`

**Timing**:
- Enter animations: 300–600ms with easing (cubic-bezier, not linear)
- Hover transitions: 150–250ms
- Stagger delays: 50–100ms between elements
- One well-orchestrated sequence > many scattered micro-animations

## Spatial Composition

Layout is where most AI-generated designs fail — they default to predictable, symmetric grids.

**Approaches**:
- **Asymmetric balance**: Offset elements, unequal columns, intentional imbalance
- **Overlap & layering**: Elements that cross boundaries, creating depth
- **Diagonal flow**: Lines of movement that aren't horizontal/vertical
- **Grid-breaking**: An element that deliberately escapes the grid for emphasis
- **Controlled density**: Either generous negative space OR intentional density — not an accidental middle ground

**Principles**:
- Every pixel of whitespace should be intentional
- Consistency in spacing scale (4px, 8px, 16px, 24px, 32px, 48px, 64px, 96px)
- Break the grid to create focal points, not randomly

## Backgrounds & Visual Texture

Never default to flat solid backgrounds. Create atmosphere.

**Techniques**:
- Gradient meshes (multiple color stops, radial gradients layered)
- Noise/grain textures (CSS `filter: url(#noise)` or SVG)
- Geometric patterns (repeating SVG patterns at low opacity)
- Layered transparencies (semi-transparent color blocks creating depth)
- Dramatic shadows (colored shadows, not just gray `box-shadow`)
- Decorative borders (not just `1px solid #ccc`)
- Custom cursors (when they serve the aesthetic)
- Glassmorphism / frosted effects (when appropriate to the tone)

## Anti-Patterns to Avoid

These are the hallmarks of generic AI-generated design. Actively avoid ALL of them:

1. **Inter/Roboto/Arial** as primary fonts
2. **Purple gradient on white** color scheme
3. **Predictable card grids** — 3 equal cards in a row with rounded corners and subtle shadows
4. **Hero section with centered text, gradient background, and "Get Started" button**
5. **Cookie-cutter component patterns** that look like a Tailwind UI template
6. **Symmetric, perfectly balanced layouts** with no tension or surprise
7. **Flat solid backgrounds** with no texture or depth
8. **Generic box shadows** (`0 4px 6px rgba(0,0,0,0.1)`)
9. **Overused display fonts**: Space Grotesk, Poppins, Montserrat
10. **Same design every generation** — vary between light/dark, different font choices, different aesthetics. Never converge on common choices.

## Key Principle

**Match implementation complexity to the aesthetic vision.**

- **Maximalist designs** need elaborate code: multiple animation layers, complex gradients, detailed textures, intricate layouts
- **Minimalist/refined designs** need restraint: perfect spacing, one exceptional font pair, precise color choices, subtle motion

Both are valid. The failure mode is a maximalist brief with lazy execution, or a minimalist brief with unnecessary decoration. Execute the chosen direction fully.
