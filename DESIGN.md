# Ops Console Design System (`DESIGN.md`)

> Principal Design Engineering baseline fusing Linear / Vercel / Jakub Krehel / ibelick craft standards.

## 1. Visual Palette (90/10 Pure Zinc Discipline)
- **Light Canvas**: `bg-zinc-50` (`#fafafa`), elevated surface `bg-white` (`#ffffff`), hairline border `rgba(0, 0, 0, 0.08)`.
- **Dark Canvas**: `bg-zinc-950` (`#09090b`), elevated surface `rgba(24, 24, 27, 0.72)`, hairline border `rgba(255, 255, 255, 0.08)`.
- **Single Primary Accent**: Indigo (`#4f46e5` light / `#6366f1` dark) reserved strictly for primary CTAs, active selections, focus rings, and chart focus series.
- **Semantic Status (Text + Indicator Always Paired)**:
  - Healthy / Nominal: `#16a34a` / `#22c55e`
  - Warning / Degraded: `#d97706` / `#f59e0b`
  - Critical / Failed: `#dc2626` / `#ef4444`

## 2. Geometry, Elevation & Nested Radii
- **Nested Radius Scale**: Outer Panel `rounded-2xl` (`16px`) → Inner chart/terminal/map viewport `rounded-xl` (`12px`) → Interactive controls/inputs `rounded-lg` (`8px`) → Micro-elements/kbd `rounded-md` (`6px`).
- **Multi-Layer Physical Shadows**: Soft ambient + tight contact layer (`--shadow-card`, `--shadow-modal`), avoiding harsh single-layer black drop shadows.
- **No Card Sandwiches**: Never nest bordered shadow cards inside bordered cards; use whitespace and 1px hairline dividers.
- **Zero Static Pill Enclosures**: Metadata uses unboxed typography separated by `·` or `/`.

## 3. Typography & Optical Alignment
- **Font Pairing**: `Plus Jakarta Sans Variable` (display & UI) + `JetBrains Mono Variable` (all numeric telemetry, timestamps, ports, PIDs, scores).
- **Mandatory Rules**:
  - Headings: `text-balance tracking-tight font-semibold`.
  - Descriptions: `text-pretty text-[var(--ink-muted)]`.
  - Numbers & Timestamps: `tabular-nums`.
  - Zero `font-weight` shift between default, hover, and active/selected states.
  - Play triangles receive `translate-x-[1px]` optical centering.

## 4. Motion, Frequency Gating & Mobile Native Feel
- **High-Frequency Zero-Latency**: Navigation switching, filter tabs, and `cmdk` keyboard movement respond instantaneously.
- **Compositor-Only**: Only animate `transform` and `opacity` (GPU `scaleX` for progress/latency meters; strictly zero `transition: all`).
- **Tactile Damping**: Buttons apply `active:scale-[0.97]`, modals enter from `scale(0.96)` + `opacity: 0` in `190ms cubic-bezier(0.23, 1, 0.32, 1)`.
- **Mobile Native**: Root layout uses `min-h-dvh`, inputs use `text-[16px] sm:text-[13px]` to prevent iOS auto-zoom, `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`, `Vaul` drawer navigation, and PWA installability (`manifest.webmanifest` + `sw.js`).

## 5. Approved UI Library Stack
- `Tailwind CSS v4` + `clsx` + `tailwind-merge` + `class-variance-authority`
- `@ui-sdk/react` (Dialog, AlertDialog, Tabs, ToggleGroup)
- `Sonner` (Toasts) · `Vaul` (Mobile Drawer) · `cmdk` (`⌘K` Command Palette)
- `motion/react` (`MotionConfig reducedMotion="user"`) · `@number-flow/react` (`NumberFlow`)
- `Recharts` (Historical & AI Gateway telemetry charts) · `@xyflow/react` (Architecture topology) · `lucide-react` (`strokeWidth={1.75}`)
