# AI Coding Agent Instructions for learn_next_js

## Project Overview
A Next.js 16.1 learning project exploring React 19 components and app router patterns. Uses TypeScript, Tailwind CSS v4, and ESLint configuration specific to Next.js conventions.

## Architecture & Structure
- **App Router**: All components live in `app/` directory (Next.js 13+ app directory pattern)
- **Client/Server Components**: Pages use `"use client"` directive for client-side interactivity; no API routes yet
- **Component Organization**: 
  - `page.tsx` - Main page with demo components (OrgSrc, ProfileState, MyButton)
  - `Gallery.tsx` - Reusable Profile component demonstrating composition
  - `layout.tsx` - Root layout (currently minimal, fonts/metadata commented out)
- **Styling**: Tailwind CSS v4 with custom PostCSS configuration

## Critical Developer Workflows

### Development & Testing
```bash
npm run dev        # Start Next.js dev server (hot reload at http://localhost:3000)
npm run build      # Production build to `.next/` directory
npm start          # Run production-optimized server
npm run lint       # ESLint check (next-specific rules)
```

### Key Build Output
- `.next/` directory - Compiled output (add to .gitignore if not present)
- `next-env.d.ts` - Auto-generated TypeScript definitions for Next.js

## Project-Specific Conventions

### TypeScript Configuration
- **Target**: ES2017 with strict mode enabled
- **Path alias**: `@/*` maps to project root (e.g., `import { MyComponent } from '@/app/components'`)
- **JSX**: React 19 JSX transform (react-jsx plugin)

### React 19 Patterns in This Codebase
1. **Client Components**: Explicitly marked with `"use client"` at file top
2. **Functional Components**: All components are function-based (no classes)
3. **State Management**: Uses React hooks (`useState`) for local state (see `page.tsx` OrgSrc)
4. **Component Composition**: Gallery.tsx demonstrates simple composition with Profile reuse

### Next.js Specific Patterns
- **Image Optimization**: Use `next/image` Image component instead of HTML `<img>` (see page.tsx example with next.svg)
  - Always specify `width`, `height`, and `alt` props
  - Use `priority` prop for above-fold images
- **Font Optimization**: `next/font/google` available for optimization (currently commented in layout.tsx)
- **Metadata**: Export `Metadata` type from `next` in layout.tsx for page titles/descriptions

### ESLint Rules
Project uses `eslint-config-next` (v16) which enforces:
- Core Web Vitals compliance
- TypeScript best practices
- Next.js-specific warnings (e.g., missing Image optimization)
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Integration Points & Dependencies
- **React 19.2.3**: Latest React with concurrent features
- **Next.js 16.1.1**: App router with React 19 compatibility
- **TypeScript 5**: Strict type checking
- **Tailwind CSS 4**: Utility-first CSS with PostCSS plugin
- **No external APIs**: All data currently hardcoded (user object in page.tsx)

## Patterns & Examples to Reference

### Component Example (Composition Pattern)
```tsx
// Gallery.tsx - demonstrates reusable component
export function Profile() {
  return <img src="..." alt="..." />;
}

export default function Gallery() {
  return (
    <section>
      <h1>Amazing scientists</h1>
      <Profile />  {/* Reused 3x */}
      <Profile />
      <Profile />
    </section>
  );
}
```

### State & Styling Pattern
```tsx
// page.tsx snippet - client component with state
"use client";
import { useState } from 'react';

function MyButton() {
  return <button>I'm a button</button>;  // Interactive element
}

// Tailwind utility classes for styling
<div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
```

### Image Optimization Pattern
```tsx
// Always use next/image for optimization
import Image from "next/image";

<Image
  src="/next.svg"
  alt="Next.js logo"
  width={100}
  height={20}
  priority  // For LCP images
/>
```

## When Adding New Features
1. **Client interactivity**: Add `"use client"` at file top; use React hooks
2. **New pages**: Create `app/[route]/page.tsx` with optional `layout.tsx`
3. **Shared components**: Place in `app/` or create `app/components/` subdirectory
4. **Styling**: Use Tailwind utility classes (dark mode with `dark:` prefix supported)
5. **External data**: Consider API routes in `app/api/` or server components when needed
6. **Lint before commit**: Run `npm run lint` to catch Next.js-specific issues

## Common Gotchas
- **Image imports**: Use relative paths from public folder or URL strings, not import statements for images
- **Metadata**: Only in root or segment layouts, export as constant
- **Client boundaries**: Minimize `"use client"` scope; prefer server components as default
- **Tailwind v4**: Different config format than v3; uses PostCSS plugin (see postcss.config.mjs)
