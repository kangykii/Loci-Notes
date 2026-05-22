# Loci Notes Design Reference

This is the working design reference for Loci Notes. It records the design language that exists in the app today, the tensions that need deliberate decisions, and the questions still open.

## Product Feel

Loci Notes currently presents as a quiet, local-first study workspace. The core mood is warm paper, black ink, soft graphite, and small study rituals rather than bright productivity software.

The strongest design promise is: keep the page calm while helping students turn rough notes into reusable knowledge.

Design keywords:

- Calm
- Warm
- Editorial
- Study-focused
- Local-first
- Ink-on-paper
- Useful before decorative

Avoid drifting toward:

- Generic SaaS dashboards
- High-chroma productivity palettes
- Heavy gradients or neon AI styling
- Marketing-first layouts inside the app
- Cute decoration that competes with writing

## Current Visual Language

The app uses a restrained warm-neutral system:

- Canvas: warm grey paper tones such as `#E7E6E2`, `#F4F4F2`, `#F5F4EF`.
- Ink: near-black and graphite such as `#1A1A1A`, `#171717`, `#2E3440`.
- Muted text: mauve-grey and warm grey such as `#5A5260`, `#7F7981`, `#8A8580`.
- Accent: dark blue-grey, currently `#2E3440` / `#27323F`.
- Secondary accents: warm beige, sage, rose, and soft blue-grey on the landing page.

The current surfaces are intentionally soft:

- App shell uses warm paper backgrounds and subtle borders.
- Modals and search use translucent glass surfaces.
- The editor and home view use wide negative space.
- The sidebar is quiet and narrow, with icon-first navigation.
- Cards are present, but the better app surfaces feel like paper sections, panels, or notes rather than glossy cards.

Typography is mostly Inter/system sans. The app also keeps a serif token available for note/editor experiments. The landing page uses large confident display type, while the app itself is denser and more utilitarian.

## Core Screens

### Landing Page

The landing page is the public product explanation. It already has a clear proposition: "A calmer workspace for serious students."

What works:

- The first viewport shows the product concept immediately.
- The product demo is more useful than a vague hero illustration.
- The palette matches the app's warm paper identity.
- The visual hierarchy is confident and simple.

Risks:

- The landing page is more polished and commercial than the app shell, so future app work should not copy its hero-scale typography into dense tool surfaces.
- Some landing copy describes the design intent too explicitly. Public copy should sell the outcome, not explain the design choices.

### Home

The home screen is editorial and personal. It uses a greeting, a "continue writing" surface, tips, recent notes, and marginalia.

What works:

- It feels like a study desk instead of a dashboard.
- Marginalia gives Loci a recognizable identity.
- The empty/low-pressure writing tone fits the product.

Risks:

- The large editorial surface may compete with fast repeated use if it becomes too decorative.
- The current minimum desktop width means mobile/responsive behavior is not a first-class app target yet.

### Editor

The editor is the product center. Its design should prioritize writing, selecting, atomising, highlighting, asking AI, and exporting without visual noise.

What works:

- Floating bottom toolbar keeps writing controls close but not permanent in the text column.
- Atomise, Format, AI prompt, Highlight, and More form a memorable workflow.
- Focus mode and marginalia support the idea of a quieter writing surface.
- Block side controls and image crop controls make editing feel more direct.

Risks:

- The editor has many powerful controls in one surface. Without strict hierarchy it can become busy.
- Some controls are text buttons where icon-first buttons might be calmer and more consistent.
- AI needs to feel like a study tool, not a separate brand layer.

### Atoms And Study

Atoms, flashcard sets, matching, and quizzes make Loci more than a notes app. This area should feel like study practice, not a gamified toy.

What works:

- The concept of atoms as reusable ideas is distinctive.
- Study sets give a concrete reason for turning notes into structured knowledge.
- Quiz setup and results have clear utility.

Risks:

- Study UI can easily become card-heavy and visually separate from the writing system.
- Success/error states need a consistent color language that still fits the muted palette.

### Projects And Community

Projects organize context, memory, writing style, and criteria. Community/social features appear to be emerging and should stay quiet, consentful, and secondary to the user's private workspace.

Risks:

- Project memory is powerful but abstract. It needs a design pattern that makes stored context legible without making the app feel administrative.
- Community features could break the local-first feeling if they are too prominent or feed-like.

## Interaction Principles

1. Writing stays visually dominant.
2. Controls appear near the work they affect.
3. AI actions should be explicit, interruptible, and visibly scoped.
4. Study tools should feel rigorous, not playful for its own sake.
5. Marginalia and artwork should sit in negative space, never over the user's work.
6. Motion should be soft, short, and optional through reduced-motion settings.
7. Focus states must be visible but muted.
8. Dense work surfaces should use small, stable controls and avoid layout shift.

## Component Guidance

Buttons:

- Primary actions use dark ink fills with warm text.
- Secondary actions use quiet paper/glass fills.
- Icon buttons should use lucide icons where available.
- Text buttons are acceptable for high-meaning workflow actions such as Atomise, but repeated tool controls should prefer icons plus tooltips.

Panels:

- Prefer full-width surfaces, editor sheets, and restrained panels over nested cards.
- Cards are best for repeated items such as notes, atoms, flashcards, recipients, and search hits.
- Avoid putting cards inside cards.

Dialogs:

- Use translucent warm surfaces only when the modal needs to feel lightweight.
- Keep destructive actions visually distinct but not bright red unless the consequence is severe.

Lists:

- Lists should be scan-friendly, with clear title, metadata, and one visible next action.
- Avoid decorative thumbnails unless they carry actual product information.

Illustration:

- Use marginalia as sparse ink accents.
- Prefer single-weight line art, transparent/off-white backgrounds, optional very muted blush accents.
- Hide illustration on cramped layouts.

## Design Debt

- Design tokens are split across `src/App.css`, `src/Landing.css`, and later `:root` blocks in `App.css`.
- Radius values are inconsistent: app cards go from tight 6px controls to 22px editorial cards and 24px shells.
- The landing page and app use related but separate palettes.
- Some manual SVG icons remain in editor block controls even though lucide is already used elsewhere.
- The app has strong local visual language, but it is not yet codified as named tokens or reusable component primitives.
- The phrase "quiet" appears throughout the product, but needs a sharper definition so "quiet" does not become "low contrast" or "underpowered."

## Proposed Design Direction

Loci should become a "study atelier": a calm desktop workspace where notes, memory, and revision feel like parts of the same table.

This means:

- Warm paper base, black ink hierarchy.
- Blue-grey as the primary structural accent.
- Muted secondary colors only for meaning: highlight, success, warning, review state, collaboration.
- Editorial personality on home and landing.
- Compact professional controls in the editor and study flows.
- Artwork as atmosphere around the work, not the work itself.

## Open Questions

These need product/design decisions from Kangy:

1. Should Loci feel more like a beautiful writing desk, a serious study lab, or a hybrid of both?
2. Who is the primary user: high school students, university students, researchers, writers, or "students" broadly?
3. Should the app remain desktop-first, or should responsive/mobile app behavior become a design requirement?
4. How prominent should AI feel: quiet assistive tool, central co-pilot, or mostly hidden until called?
5. Should atoms feel academic and rigorous, or more like lightweight personal memory cards?
6. What is the right emotional tone for study feedback: encouraging, neutral, strict, or coach-like?
7. Should community features feel like messaging, shared study rooms, or a minimal sharing layer?
8. How much illustration is right: only home/landing, also empty states, or throughout the app?
9. Do we want a named color/token system now, or should we first stabilize screen-level design decisions?

## Immediate Next Decisions

Before a full design system, decide:

1. Final product personality: writing desk, study lab, or hybrid.
2. Primary audience and tone of voice.
3. Whether landing and app should share one token palette.
4. How icon-first the editor toolbar should become.
5. Whether `docs/design.md` should stay descriptive, or become a stricter implementation spec.

