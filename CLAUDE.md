# Orçamento Pessoal (Base Zero) / rules-for-ai

In the root folder where the React Native/Expo code lives:

## Reference Documentation

Before implementing any feature that touches the database schema, screen structure, navigation flow, or a business rule you're not 100% sure about, **read `technical-specification.md`** (same repo root). It is the source of truth for:
- Full data model (all tables, fields, relationships).
- Screen-by-screen breakdown, including submenus and empty/edge states.
- Step-by-step flows (e.g., credit card spending, loan payment, backup).
- The exact formulas for Ready to Assign, category available amount, and loan amortization.

This file (`CLAUDE.md`) covers *how to write code* in this repo. `technical-specification.md` covers *what the app does and how it's structured*. Do not duplicate spec content into code comments at length — reference the relevant section number instead (e.g., `// see technical-specification.md §8.3 for amortization formula`).

If a task seems to require a product decision that isn't covered in the spec, do not invent one silently — flag it instead of guessing.

## General Rules & Architecture

- **Stack Context:** This is an offline-first React Native app using Expo (managed workflow), TypeScript, `expo-sqlite`, and Drizzle ORM.
- **No Backend Calls:** Never add code that makes network calls to a backend API for saving or fetching core budget data. All data is stored locally in SQLite. The only exception is the Google Drive API for backup functionality.
- **Google Drive Scope:** The Google Drive integration must request **only** the `drive.file` OAuth scope. Never request full Drive access (`drive` or `drive.readonly` scopes), even if it seems to simplify implementation. This is a deliberate privacy/security decision, not an oversight.
- **Zero-Based Budgeting Principles:**
  - Money must be explicitly assigned to categories.
  - Credit card spending removes money from a budget category and automatically reassigns it to a system category (`Pagamento — [Nome do Cartão]`). Do not double-count credit card spending against the "Saldo a Orçar" (Ready to Assign).
- **Simplicity First:** Prefer clear, explicit code over overly clever abstractions. The app is open-source and meant to be maintained easily.

## Typescript, React Native & Code Quality

- **Code Comments:** All code comments MUST be written in English.
- **Typing:** Use strict TypeScript. Avoid `any`. Define interfaces or types for all component props, database schemas, and state objects.
- **Components:** Use functional components with hooks. Do not use class components.
- **Styling:** Use NativeWind (Tailwind for React Native) for all styling. Code styling must be clear, consistent, and easy to read. Avoid `StyleSheet.create` unless absolutely necessary for complex animations or native-specific constraints.
  - *Example:* Prefer `<View className="flex-1 bg-gray-100 p-4">` over custom style objects.
- **Theming:** Color themes are a **fixed, pre-built catalog** (e.g., `ocean`, `sunset`, `forest`) — not a free-form color picker. Each theme is a self-contained config object (accent, background, surface, success/warning/error colors) with both a light and dark variant. Implement theme switching via a theme context/provider that maps the active `color_theme_id` to NativeWind-compatible class names or CSS variables consumed by `tailwind.config`. Do not hardcode a single accent color directly into component classNames — always resolve it through the active theme.
- **Internationalization:** Every user-facing string MUST go through `react-i18next` (`useTranslation` / `t('key')`) — never hardcode UI text directly in JSX, including placeholders, button labels, error messages, and empty-state copy. Translation keys live in per-language resource files (`pt-BR`, `en` at minimum, per technical-specification.md §6.4). If you catch yourself writing a raw string inside a `<Text>` component, stop and add it to the translation resources instead. Code comments stay in English regardless (see above) — this rule is about text the user sees, not developer-facing text.
- **Imports:** Group imports logically. React/React Native first, third-party libraries second, internal absolute paths third, and relative paths last.
- **State Management:** Use Zustand for global state management (especially for budget calculations and available balances). Avoid Context API for data that changes frequently (like transactions) to prevent unnecessary re-renders. Context API is acceptable for low-frequency global state like the active theme.

## Database & Drizzle ORM

- **Schema:** The database schema is the source of truth. All tables must be defined in the Drizzle schema file (`schema.ts`).
- **Calculations over Caching:** The available balance of a category ("Disponível") and the "Saldo a Orçar" are calculated values, not stored directly in columns, unless explicitly requested for performance reasons. Always use Drizzle queries or Zustand selectors to calculate these sums dynamically.
- **Money Representation:** All money amounts must be stored as integers representing **cents** (e.g., `1050` for R$ 10,50) to avoid floating-point precision errors.

## Code Structure & Routing

- **Expo Router:** Use file-based routing via Expo Router.
  - The main navigation is a bottom tab bar (Home, Budget, Transactions, Accounts, Reports).
  - Use `_layout.tsx` files to define navigation structures (Stack, Tabs).
- **Component File Size:** If a component file exceeds 300-400 lines, consider extracting smaller sub-components into separate files.
- **Naming Conventions:**
  - Files representing screens or components should use PascalCase (e.g., `CategoryDetail.tsx`).
  - Utility files, hooks, and services should use camelCase (e.g., `useBudgetCalculations.ts`).

## Testing & Coverage

Coverage requirements are **tiered by risk**, not a flat percentage across the whole codebase:

- **Core business logic (high priority — aim for ~100% coverage):** anything under budget calculations, category "Disponível" math, "Saldo a Orçar" math, credit card payment reassignment logic, and loan amortization. Bugs here are expensive (wrong balances, silent data corruption) and the logic is pure/testable by nature — there's no excuse to skip it.
- **UI components and screens (moderate — no fixed %, use judgment):** test meaningful interaction and rendering logic (e.g., "does the overspent indicator show when available < 0"), but do not chase coverage numbers on purely presentational code. Superficial tests written just to hit a metric are worse than no test — they add maintenance cost without catching real bugs.
- **Glue code / navigation wiring:** generally not worth dedicated tests unless it contains actual logic (e.g., a redirect guard).
- Do not try to run tests using generic `npm test` without ensuring Jest (or the chosen testing framework) is configured.
- Avoid modifying test settings just to bypass coverage requirements on the core business logic tier — that tier's bar is not negotiable.

## Git Workflow & Pre-Commit Rules

- **Semantic Commits:** All commits MUST follow the Semantic Commits standard (e.g., `feat:`, `fix:`, `chore:`, `refactor:`).
- **Commitlint:** Commits must be tested and validated with `commitlint` before being published.
- **Pre-commit Routine (tiered, to keep early prototyping fast):**
  - Linter must always pass before any commit — no exceptions.
  - Tests directly affected by the change (same file/module or its direct dependents) must always pass before commit.
  - The **full** test suite must pass before a feature/PR is considered done and merged — it does not need to be re-run on every single intermediate commit while a feature is still in progress on a branch. This keeps iteration fast during active development without giving up the safety net at merge time.
- **Task Completion:** After successfully completing a task (and passing lint + the relevant test tier), a commit must be made following the stipulated standards.

## UI/UX Guidelines

- Keep the interface lean. Prioritize clarity over data density.
- Honor the user's theme preference (Light/Dark/System) via NativeWind's dark mode capabilities, combined with the active pre-built color theme (see Theming above).
- Do not add gamification elements (like progress bars in onboarding) unless explicitly defined in the spec.

## PR and Change Size

- Keep changes focused. If a feature touches the database schema, UI, and business logic, ensure it is one cohesive logical unit (e.g., "Add Credit Card Payment Flow").
- Do not arbitrarily refactor code outside the scope of the immediate task unless it directly blocks the implementation.
