---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use when the user asks to build web components, pages, or applications, redesign an existing interface, update a website's look, or asks for frontend styling/design help.
---

# Frontend Design

Build frontend interfaces that look genuinely designed — not like generic AI output. Bold or minimal, the key is intentionality.

See [aesthetics-guide.md](references/aesthetics-guide.md) for detailed design guidelines and [examples.md](references/examples.md) for concrete design decisions.

## Phase 1 — Gather context

Before any code, understand what you're working with.

Ask the user (or infer from the request):

- [ ] **Scope**: New from scratch, or redesigning existing code? Which files/components?
- [ ] **Purpose**: What problem does this interface solve? Who uses it?
- [ ] **Constraints**: Framework? Must support mobile? Accessibility requirements? Performance budget?
- [ ] **Existing design system**: If working with existing code — what fonts, colors, spacing patterns are already in use? Decide what to keep vs. replace.

If redesigning existing code:
- Read the current styles (CSS files, tailwind config, theme tokens)
- Identify what works and what doesn't
- Decide: incremental refresh (update tokens, fonts, spacing) or full visual rewrite
- Flag any functional behavior that must be preserved

## Phase 2 — Choose aesthetic direction

Pick ONE clear direction and commit. Do not hedge.

**Tone options** (for inspiration — invent your own when the context demands it):
Brutally minimal · Maximalist chaos · Retro-futuristic · Organic/natural · Luxury/refined · Playful/toy-like · Editorial/magazine · Brutalist/raw · Art deco/geometric · Soft/pastel · Industrial/utilitarian · Cyberpunk/neon · Swiss/typographic · Hand-crafted/artisan

Then decide:

- [ ] **Typography**: 1–2 fonts. Distinctive display + refined body. Never Inter, Roboto, Arial, or system-ui. See [aesthetics-guide.md](references/aesthetics-guide.md) for font guidance.
- [ ] **Color system**: CSS variables. Dominant base + sharp accents. No purple-gradient-on-white cliché.
- [ ] **Spatial approach**: Symmetric grid? Asymmetric overlap? Dense or airy? Decide now.
- [ ] **Motion philosophy**: What moves, when, and why? One orchestrated moment beats scattered micro-animations.
- [ ] **Differentiation**: What's the ONE thing someone will remember about this interface?

**Present the direction to the user** in 3–5 sentences before coding. One line per decision (font, colors, layout, motion, the hook). Let them course-correct early.

**If this feeds into a PRD** (via `/to-prd`), format the decisions so they map cleanly to Implementation Decisions. Each design choice should be a self-contained bullet: what was chosen and why. Example:

```
- Display font: Cormorant Garamond — elegant serif that supports the editorial tone
- Color system: off-black (#0a0a0a) / warm white (#faf8f5) / gold accent (#c9a96e) — gallery aesthetic
- Layout: asymmetric, editorial magazine spread with large hero images left-aligned
- Motion: fade-in on scroll, 600ms ease, 80ms stagger between elements — mimics walking through a gallery
- The hook: full-bleed images extending to viewport edge for dramatic immersion
```

Do not proceed to Phase 3 until direction is confirmed (or user is AFK and direction is clearly implied by the request).

## Phase 3 — Implement

Write real, working code. Match implementation complexity to the aesthetic vision — maximalist designs need elaborate effects; minimalist designs need restraint and precision.

Build in this order:

1. **Foundation**: HTML structure, CSS variables (colors, fonts, spacing scale)
2. **Layout**: Spatial composition — grids, breakpoints, positioning
3. **Typography**: Font loading, sizing scale, weights, line-heights
4. **Color & backgrounds**: Gradients, textures, atmosphere (not flat solids)
5. **Motion**: Page-load reveals, hover states, scroll-triggered effects
6. **Details**: Decorative borders, shadows, grain overlays, custom cursors — the finishing touches

For animations:
- Prefer CSS-only for HTML projects
- Use Motion library (framer-motion) for React when available
- Use staggered `animation-delay` for orchestrated reveals
- Respect `prefers-reduced-motion`

## Phase 4 — Quality check

Before declaring done:

- [ ] Fonts actually load (correct `@import` or `<link>`, fallback stack defined)
- [ ] CSS variables used consistently — no magic hex values scattered in components
- [ ] Responsive at mobile / tablet / desktop (or the breakpoints the user specified)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No generic AI-slop patterns (see anti-patterns in [aesthetics-guide.md](references/aesthetics-guide.md)))
- [ ] Every design choice serves the chosen tone — nothing random or default-looking
- [ ] Functional behavior preserved if this was a redesign (all buttons, links, interactions still work)

If any fail, fix before showing the user.

## Redesigning existing code — special considerations

When updating an existing website's look rather than building from scratch:

1. **Audit first**. Read all current styles before changing anything. Map the existing design tokens.
2. **Preserve structure, change skin.** Prefer updating CSS/tokens over rewriting HTML unless the layout fundamentally changes.
3. **Incremental where possible.** If the site has 20 components, propose which ones to tackle first rather than a risky big-bang rewrite.
4. **Test as you go.** After each component update, verify existing functionality still works.
5. **Clean up orphaned styles.** Old CSS that no longer applies to anything should be removed, not left to cause confusion.
