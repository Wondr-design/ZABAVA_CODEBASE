# Repository Guidelines

## Project Structure & Module Organization
- `src/` is the application root; `main.tsx` wires React Router and global providers.
- Route-level views live in `src/pages/`; they're gated through `src/components/PrivateRoute` and `AdminRoute`.
- Shared UI and logic live in `src/components/`, `src/hooks/`, `src/context/`, and `src/lib/` (API helpers, utilities).
- `src/types/` centralizes TypeScript interfaces; assets belong in `src/assets/`.
- Static files stay in `public/`; Vite outputs builds to `dist/` (leave untracked).

## Build, Test, and Development Commands
- `pnpm install` installs dependencies; keep lockfile changes intentional.
- `pnpm dev` starts Vite on http://localhost:3000 using the `VITE_DEV_API_PROXY` fallback.
- `pnpm build` generates the production bundle in `dist/`; run before shipping changes.
- `pnpm preview` serves the built bundle for final smoke tests.
- `pnpm lint` runs ESLint (`eslint.config.js`); resolve warnings before submitting.

## Coding Style & Naming Conventions
- Stick with TypeScript + React function components; type props and local state explicitly.
- Follow the two-space indentation and double-quote style already present; ESLint enforces the rest.
- Use Tailwind utilities for styling and compose variants with the `cn` helper from `src/lib/utils.ts`.
- Prefer the `@/` path alias to avoid deep relative imports.
- Name components and files in PascalCase, hooks in camelCase starting with `use`, and constants in SCREAMING_SNAKE_CASE.

## Testing Guidelines
- Automated tests are not yet in place; run targeted manual checks in `pnpm dev` (auth flows, dashboards, API calls) before opening a PR.
- When adding tests, colocate `*.test.tsx` or `*.test.ts` files beside the code under test and document the new command here.
- Record any manual QA steps in the PR description so reviewers can reproduce them quickly.

## Commit & Pull Request Guidelines
- History mixes plain titles and Conventional Commits (e.g., `fix: proxy admin api`); align on `<type>: <short summary>` for clarity.
- Keep commits focused; explain rationale or follow-up tasks in the body when needed.
- PRs should link to issues or tasks, outline the change, list manual verification, and include screenshots or clips for UI updates.
- Flag configuration or environment updates explicitly so deploys can be prepared.

## Environment & Security Notes
- Configure `VITE_API_BASE_URL` in `.env.local`; production builds read it via `src/lib/config.ts`.
- The dev server proxies `/api` to `VITE_DEV_API_PROXY`; avoid hard-coded domains in components.
- Do not commit secrets, sample credentials, or generated `dist/` artifacts; scrub any user data before sharing.
