# Technical Specification — Zero-Based Personal Budget App

Version 0.1 · Living document, serves as the implementation reference.

---

## 1. Overview

Android personal finance app based on the **zero-based budgeting** method: every dollar (or real) that comes in must be assigned to a spending category before it's used. The goal is to eliminate the "where did my money go?" question by answering it the moment money comes in, not after it's already gone.

Design principles:
- Simple to set up, no technical knowledge required from the end user.
- Lean interface — prioritizes clarity over information density.
- 100% offline-first, data stored locally, optional backup to the user's own personal cloud.
- No automatic bank syncing — all data entry is manual.
- Open source (MIT), user-customizable appearance.
- Internationalized from the start — every user-facing string goes through the i18n layer, even though the initial target audience is Brazilian Portuguese speakers. Retrofitting i18n after strings are hardcoded everywhere is expensive; building it in from day one is not.

---

## 2. Core Concepts

### 2.1 Money available to budget
There's a central value, referred to here as **Ready to Assign**, representing money that has already entered budget accounts but hasn't been assigned to any category yet.

```
Ready to Assign (cumulative) =
    Σ (inflows classified as "Income" in budget accounts, all months)
  − Σ (amounts assigned to categories, all months)
```

This value can go negative (the user assigned more than they received — the budget doesn't balance) or positive (leftover money with no destination). The goal of the method is to keep it at zero.

### 2.2 Budget accounts vs. tracking accounts
- **Budget accounts**: their balance counts toward Ready to Assign. Includes cash-type accounts (checking, savings, wallet) and credit accounts (credit card, line of credit).
- **Tracking accounts**: exist only to track net worth (investments, assets, long-term debts). They don't affect Ready to Assign — they only feed into the net worth calculation.

### 2.3 Categories and groups
Categories are organized into groups (e.g., "Fixed Bills," "Needs," "Wants"). Each category, in each month, has three numbers:

```
Assigned (month)   → how much was allocated to this category this month
Activity (month)   → sum of the month's transactions in this category (negative = spending)
Available          → the category's cumulative balance (assigned + previous month's available + activity)
```

**Available** rolls over from month to month automatically (a surplus becomes available in the following month; a deficit also rolls over, reducing next month's available amount).

### 2.4 Credit cards
A credit card is a budget account whose balance can go negative (debt). The core rule:

> Spending on a credit card doesn't reduce Ready to Assign twice. When a transaction is logged on a credit card account, the amount leaves the chosen category (e.g., Groceries) and is automatically added to a system category called **"Payment — [Card Name]"**, inside a system group called **"Credit Card Payments"**.

This keeps the total budget at zero: the money that would have been spent on Groceries is now reserved to pay the bill. When the user records the card payment (a transfer from checking to the card), the amount leaves the "Payment — [Card]" category and pays down the outstanding balance.

System categories and the system group are created automatically when a credit card account is added, and removed (or archived) if the account is archived.

### 2.5 Loans and financing
Loan-type accounts (financing, personal loans, etc.) store, in addition to the outstanding balance:
- Annual interest rate (%)
- Monthly payment amount required by the lender

Each month, the app calculates an estimated split between interest and principal (see section 8.3), and reduces the account's outstanding balance based on the amortized principal — not the full payment amount.

Unlike credit cards, paying a loan installment does **not** generate an automatic system category — the user budgets the installment as a normal category (e.g., "Car Loan"), since it's a predictable, fixed amount.

---

## 3. Technical Architecture

| Layer | Choice |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Target platform | Android (native via Expo) |
| Language | TypeScript |
| Database | Local SQLite (`expo-sqlite`), no remote backend |
| ORM/query layer | Drizzle ORM |
| Schema migrations | `drizzle-kit`, migration files committed to the repo (`/drizzle` folder); migrations run on app startup if there are pending ones |
| Routing | Expo Router (file-based), Stack + Tabs navigation |
| Styling | NativeWind (Tailwind for React Native) |
| State management | Zustand — used especially for budget calculations and available balances, avoiding the excessive re-renders that Context API would cause on frequently-changing data (transactions) |
| Production build | EAS Build (free tier) |
| Local development & testing | Android Studio emulator, running a custom development build (`npx expo run:android`) — not the Expo Go app. Required as soon as any native module without Expo Go support is used (see note below) |
| Internationalization (i18n) | `i18next` + `react-i18next` for string translation, `expo-localization` to detect the device's default locale |
| Backup | Google Drive API, `drive.file` scope (never full Drive access), uploads the `.db` file or a `.json` export |
| Authentication (backup only) | Google Sign-In via `expo-auth-session` |
| Preferences persistence | `expo-secure-store` (tokens) + `settings` table in SQLite (general preferences) |

There's no server, no centralized user account, no telemetry. All sensitive data (Google OAuth token) stays local, in the device's secure storage.

**Note on dropping Expo Go:** development now happens against an Android Studio emulator running a locally built development client, instead of the Expo Go app. This has no impact on any decision made so far — the stack is still the Expo managed workflow (`expo-sqlite`, Drizzle, EAS Build for release), just tested locally instead of through the Expo Go sandbox. The practical consequence is that native modules requiring a custom dev client (which Expo Go can't run) are now an option if ever needed later — but that is not a reason to revisit the `expo-sqlite` vs. `op-sqlite` decision from section 3; the rationale there (data volume too small to matter) stands regardless of the testing method.

---

## 4. Data Model

### 4.1 Table overview

```
accounts
account_loan_details (1:1 with accounts, loan type only)
category_groups
categories
category_month_budgets
transactions
transfers (links two transactions)
app_settings
backup_log
```

### 4.2 `accounts`

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | Nickname given by the user |
| type | TEXT | `checking`, `savings`, `cash`, `credit_card`, `line_of_credit`, `mortgage`, `auto_loan`, `student_loan`, `personal_loan`, `medical_debt`, `other_debt`, `asset`, `liability` |
| category_kind | TEXT | derived from `type`: `cash`, `credit`, `loan`, `tracking` — used for business logic without repeating switch/case across the whole app |
| is_budget_account | BOOLEAN | `true` for cash/credit, `false` for loan/tracking (doesn't count toward Ready to Assign) |
| initial_balance | INTEGER | in cents, balance at the time of creation |
| current_balance | INTEGER | in cents, calculated from `initial_balance` + transactions (can be kept as a cached column, recalculated via trigger or at runtime) |
| currency | TEXT | default `BRL` |
| archived | BOOLEAN | default `false` |
| created_at | DATETIME | |
| sort_order | INTEGER | display order set by the user |

### 4.3 `account_loan_details`

Only one row exists per loan/financing-type account.

| Field | Type | Notes |
|---|---|---|
| account_id | INTEGER PK/FK → accounts.id | |
| interest_rate_annual | REAL | e.g., `8.5` for 8.5% annual |
| monthly_payment | INTEGER | in cents, total installment amount (principal + interest + fees) |
| term_months | INTEGER | optional, total term in months |

### 4.4 `category_groups`

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | |
| sort_order | INTEGER | |
| is_system | BOOLEAN | `true` for the automatically generated "Credit Card Payments" group |
| archived | BOOLEAN | |

### 4.5 `categories`

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| group_id | INTEGER FK → category_groups.id | |
| name | TEXT | |
| icon | TEXT | emoji or icon identifier |
| is_system | BOOLEAN | `true` for "Payment — [Card]" categories |
| linked_account_id | INTEGER FK → accounts.id, nullable | populated only for credit card payment system categories |
| sort_order | INTEGER | |
| archived | BOOLEAN | |

### 4.6 `category_month_budgets`

One record per category, per month.

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| category_id | INTEGER FK → categories.id | |
| month | TEXT | format `YYYY-MM` |
| assigned_amount | INTEGER | in cents, how much was assigned this month |
| target_amount | INTEGER, nullable | optional goal (see 4.9) |
| UNIQUE(category_id, month) | | |

A category's **Available** amount isn't stored directly — it's calculated by summing `assigned_amount` and activity (sum of transactions) across every month up to the current one. It can be cached for performance, but the calculation is the source of truth.

### 4.7 `transactions`

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| account_id | INTEGER FK → accounts.id | |
| category_id | INTEGER FK → categories.id, nullable | null on transfers |
| amount | INTEGER | in cents, negative = outflow, positive = inflow |
| payee | TEXT | description/payee |
| date | DATE | |
| memo | TEXT, nullable | |
| cleared | BOOLEAN | default `false` |
| flag | TEXT, nullable | |
| is_transfer | BOOLEAN | default `false` |
| transfer_id | INTEGER FK → transfers.id, nullable | |
| created_at | DATETIME | |

### 4.8 `transfers`

A transfer generates two rows in `transactions` (an outflow in one account, an inflow in another) linked by this record, to keep integrity and allow editing/deleting them together.

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| from_account_id | INTEGER FK → accounts.id | |
| to_account_id | INTEGER FK → accounts.id | |
| amount | INTEGER | positive value, in cents |
| date | DATE | |
| memo | TEXT, nullable | |

### 4.9 Category goals — simple field in v1
Instead of a separate table, `target_amount` in `category_month_budgets` covers the most common case: "I want to have X available in this category this month." More sophisticated goals (target-by-date, recurring monthly funding) are left for a future version with a dedicated `category_goals` table.

### 4.10 `app_settings`

Singleton table (a single row, fixed id = 1).

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | always `1` |
| onboarding_completed | BOOLEAN | default `false`, set to `true` after the first-run wizard (5.1) finishes |
| theme_mode | TEXT | `light`, `dark`, `system` |
| color_theme_id | TEXT | identifier of the chosen pre-built theme (e.g., `ocean`, `sunset`, `forest` — closed catalog defined in code, not a free color) |
| currency_symbol | TEXT | default `R$` |
| first_day_of_month | INTEGER | default `1`, allows budgeting on non-calendar cycles |
| locale | TEXT | default `pt-BR`, drives the active `i18next` language — see 6.4 |
| auto_backup_enabled | BOOLEAN | |
| last_backup_at | DATETIME, nullable | |
| drive_folder_mode | TEXT | `app_data_folder` or `visible_folder` |

### 4.11 `backup_log`

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| timestamp | DATETIME | |
| status | TEXT | `success`, `failed` |
| trigger | TEXT | `manual`, `auto_foreground`, `auto_background` |
| error_message | TEXT, nullable | |

---

## 5. Screens

Main navigation: fixed bottom bar with 5 destinations — **Home**, **Budget**, **Transactions**, **Accounts**, **Reports**. Settings is accessed via a header icon (it doesn't occupy a bottom bar slot, since it's not a daily-use destination).

### 5.1 Onboarding (first run)
Short, non-intrusive wizard, no "gamified" progress bar:
1. Welcome + a one-sentence explanation of the zero-based method.
2. Create the first account (account form, see 5.6).
3. Create initial categories — offers a suggested (editable) set instead of a blank screen.
4. Final screen: "you're set" → goes straight to Home.

**Submenus/states:**
- Every step has a "Skip" button except creating the first account (mandatory — the app doesn't function without at least one budget account).
- Step 3 (suggested categories): list with a checkbox per suggested category, all checked by default, the user unchecks what they don't want.
- Onboarding only runs once; tracked in `app_settings` (additional `onboarding_completed` field, not listed in the v0.1 schema — needs to be added).

### 5.2 Home
- Card featuring **Ready to Assign** prominently (large number, color changes if negative).
- Quick list of accounts with current balance (tapping leads to Accounts).
- Shortcut to "New Transaction" (floating button, present on nearly every screen).
- Categories with the most activity this month (optional, quick summary).

**Submenus/states:**
- Empty state (no accounts/categories yet): replaces the cards with a direct shortcut into onboarding or manual creation, no marketing illustration.
- Header overflow menu (⋮): quick access to Settings (shortcut, since Home is the most-visited screen).

### 5.3 Budget
- Header with month selector (arrows or dropdown).
- Collapsible category groups, each showing the group's total assigned/available.
- Each category row: name, icon, assigned, available, progress bar proportional to spending.
- A category with negative available: visual alert highlight.
- The "Credit Card Payments" system group always at the top or pinned, with a differentiated label ("Available for payment" instead of "Available to spend").
- Tapping a category opens a quick assign-amount editor (dedicated numeric keypad).
- Long-press or a secondary button opens the category detail (5.4).

**Submenus/states:**
- Month selector dropdown: direct navigation between months (not just previous/next arrows), useful for reviewing history.
- Header overflow menu (⋮): "Manage categories and groups" (shortcut to 6.2), "Show/hide progress bars," "Hide amounts" (privacy mode, masks numbers with asterisks, useful for taking screenshots without exposing real data).
- Group context menu (tap the group name or an options icon next to it): rename group, reorder, add category to group, archive group (only if every category inside is already archived).
- Quick assign-amount editor: dedicated numeric keypad with quick action shortcuts above it (e.g., "Zero out," "Fill target," "Auto-distribute leftover" — the latter optional/post-MVP).
- Overspent category state: tapping the alert indicator offers a "Cover with leftover from another category" shortcut (moves available funds from a category with a surplus to cover the deficit).

### 5.4 Category Detail
- Name, icon, group.
- Simple chart or list of assigned/activity/available for recent months.
- List of transactions in that category for the selected month.
- Editable target field (`target_amount`).
- Options to rename, change icon, move to another group, archive.

**Submenus/states:**
- Overflow menu (⋮): Rename, Change icon (emoji grid), Move to another group (list of existing groups), Archive (with confirmation, blocked if `assigned_amount` is nonzero in the current month).
- System categories (e.g., "Payment — Card X") have this menu disabled or hidden — they can't be manually renamed/archived, only through the linked account's lifecycle.

### 5.5 Accounts
- List of accounts grouped by type (Cash, Credit, Loans, Tracking), each group with a subtotal.
- Each row: name, current balance, visual indicator if negative.
- Add account button.
- Tapping an account opens its ledger (transaction list filtered by that account).

**Submenus/states:**
- Long-press or an options icon per account: Edit, Archive (blocked if balance ≠ 0 without explicit confirmation), View ledger.
- Empty state: a direct message inviting the user to create the first account, with no mention of bank syncing.
- Archived accounts: hidden by default, accessible via a "Show archived" filter in the header's overflow menu.

### 5.6 New/Edit Account
- Name field (nickname).
- Type selector, organized into the groups described in 2.2 (Cash, Credit, Loans and Financing, Tracking) — each group with a short, jargon-free explanatory sentence.
- Current balance field.
- If type = loan/financing: additional fields for interest rate and monthly payment (see 4.3).
- Save button.

**Submenus/states:**
- The type selector is its own screen/bottom sheet (not a simple dropdown), given the number of options — it mirrors the 4-group structure (Cash, Credit, Loans and Financing, Tracking), each group with the explanatory sentence above its types.
- Conditional fields: interest rate and monthly payment only appear after a type from the "Loans and Financing" group is selected (they appear with a simple expand animation, not a separate popup).
- Editing an existing account: the "current balance" field becomes read-only (balance is now derived from transactions); only the **initial** balance is editable at creation time.

### 5.7 Transactions
- Chronological list (current month by default), with filters by account, category, period, and text search.
- Each row: category icon, payee, amount (color-coded by type: outflow/inflow/transfer), date, "uncleared" indicator when applicable.
- Add transaction button.

**Submenus/states:**
- The filter icon opens a bottom sheet with: Account (multi-select), Category (multi-select), Period (date range), Status (All / Uncleared / Cleared).
- Text search: expandable search field in the header, filters by payee/memo.
- Long-press on a transaction: quick action menu (Edit, Duplicate, Delete, Mark as cleared).
- Header overflow menu: "Bulk edit" (select multiple transactions to categorize or mark as cleared at once) — post-MVP if the complexity isn't worth it for v1.

### 5.8 New/Edit Transaction
- Amount field with dedicated numeric keypad.
- Type selector: **Outflow**, **Inflow**, **Transfer**, **Credit Card Payment** (the latter pre-fills the system category and destination account).
- Fields: account, category (hidden/disabled if type = transfer), payee, date.
- Advanced fields (expandable): memo, flag, cleared, recurrence.
- Save button.

**Submenus/states:**
- The type selector is a compact dropdown at the top of the form — switching types reorganizes the fields below (e.g., Transfer hides category and shows a destination account; Credit Card Payment pre-selects the matching system category and locks it from editing).
- "Choose category": opens a searchable list, grouped the same way as the Budget screen, showing each category's current available amount next to its name (helps decide without leaving the screen).
- "Choose payee": free-text field with autocomplete based on previously used payees.
- "Show more"/"Show less" section: toggles display of memo, photo (attach receipt — evaluate whether it belongs in the MVP), flag, cleared, recurrence.
- Recurrence field, if enabled: opens a sub-menu with frequency (weekly, monthly, etc.) and an optional end date.

### 5.9 Reports
- **Spending breakdown**: by category, for the selected period, listed in descending order by amount.
- **Income vs. Spending**: bar chart by month.
- **Net worth**: sum of all accounts (including tracking) minus debts, month-over-month trend.
- Period selector available on every report.

**Submenus/states:**
- Tab or horizontal carousel navigation between the 3 reports (not separate bottom-bar screens — Reports is a single destination that contains all three).
- Each report has its own period selector (current month, last 3/6/12 months, custom range).
- Tapping a category inside "Spending breakdown" leads straight to Category Detail (5.4), filtered to the selected period.

### 5.10 Settings
Its own screen (not part of the bottom bar). See section 6 for the full item and submenu structure.

---

## 6. Settings Menu

The Settings root screen is a simple list of sections; each section below, where noted, opens its own sub-screen (not a modal) — depth navigation with the standard Android back button.

### 6.1 Appearance (sub-screen)
- Mode: Light / Dark / Follow system (segmented control or radio list).
- **Color theme:** grid of pre-built themes (not a free color picker) — each theme is a closed set of colors (accent, background, surfaces, success/warning/error states) designed to work well in both light and dark mode. The user picks from the options rather than composing colors manually.
- Each theme appears as a sample card (mini-preview with the actual colors applied), allowing visual comparison before choosing — no need to apply it just to see the result.
- Structured to grow: new themes can be added to the catalog later without changing the application logic, since each theme is just a color configuration object.

### 6.2 Accounts and Categories (sub-screen with two tabs)
- **Accounts tab:** the same list from 5.5, but with edit mode enabled by default (drag-to-reorder, bulk archive). "Add account" shortcut reusing the 5.6 screen.
- **Categories and Groups tab:** list of collapsible groups (like 5.3, but in edit mode), with:
  - "New group" button (opens an inline name field).
  - Per group: "New category" button (opens an inline name field + icon selector).
  - Drag-to-reorder groups and categories.
  - "Show archived" toggle.

### 6.3 Backup (sub-screen)
- Connection status: "Connected as [email]" or a "Connect with Google" button.
- "Automatic backup" toggle (enables/disables the foreground/background trigger described in 7.6).
- "Back up now" button (loading state during upload, with success/error feedback).
- "Last backup: [date/time]" or "Never" if `last_backup_at` is null.
- **"History"** sub-item: opens a simple list from the `backup_log` table, showing date, status (success/error icon), and trigger (manual/automatic). Tapping an item with an error shows `error_message`.
- **"Backup location on Drive"** sub-item: toggles between a hidden folder (`app_data_folder`) and a visible folder in the root of the user's Drive (`visible_folder`).
- Secondary "Disconnect Google account" button (revokes the local token, doesn't affect files already saved on Drive).

### 6.4 Preferences (sub-screen)
- Currency and number format (symbol, symbol position, decimal separator).
- Budget month start day (numeric selector, 1–28).
- **Language:** list of supported languages, backed by real `i18next` translation resources (not a placeholder). Selecting a language switches every user-facing string in the app immediately, no restart required. Defaults to the device's locale via `expo-localization` on first run if a translation exists for it, falling back to `pt-BR` otherwise. Ships with `pt-BR` and `en` at launch, structured so adding a new language is just a new resource file, not a code change.

### 6.5 About (sub-screen)
- App version and build number.
- Link to the GitHub repository (source code).
- Direct link to open a new GitHub issue (bug report/suggestion channel, replaces any notion of corporate "support").
- License (MIT) — full text or a link to the repository's `LICENSE` file.
- No blog links, newsletter items, or referral programs of any kind.

---

## 7. Main Flows

### 7.1 Create an account and start budgeting
1. The user creates an account with an initial balance → if it's a budget account, that initial balance automatically enters Ready to Assign.
2. The user creates categories (or uses the suggested set).
3. The user assigns amounts to categories on the Budget screen until Ready to Assign reaches zero.

### 7.2 Log a simple expense
1. New Transaction → type Outflow.
2. Choose account, category, amount, payee, date.
3. Save → the account's `current_balance` is reduced, `category_month_budgets` for the month reflects the new activity (via calculation, not direct write).

### 7.3 Spend on a credit card
1. New Transaction → type Outflow, account = credit card.
2. Choose a normal category (e.g., Groceries).
3. On save: besides logging the transaction, the system checks that the account is of type `credit_card` and automatically adds the spent amount to the "Payment — [Card]" system category (without creating a second visible transaction — it's a calculated category balance adjustment, not a duplicate transaction).

### 7.4 Pay the credit card bill
1. New Transaction → type Credit Card Payment.
2. Choose the source account (e.g., Checking) and the destination credit card account.
3. On save: generates a transfer between the two accounts AND reduces the "Payment — [Card]" system category by the amount paid.

### 7.5 Transfer between regular accounts
1. New Transaction → type Transfer.
2. Choose source and destination account, amount, date.
3. Generates two rows in `transactions`, without affecting categories (the money just moved location, it wasn't spent).

### 7.6 Manual backup
1. The user taps "Back up now" in Settings.
2. The app checks for a valid OAuth token; if none, it starts the Google login flow.
3. It exports the database (`.db` file or `.json` export) and uploads it via the Drive API.
4. It records the result in `backup_log` and updates `last_backup_at`.

---

## 8. Calculations and Business Rules

### 8.1 Ready to Assign
See the formula in section 2.1. Suggested implementation: a SQL view or an aggregate query, recalculated on demand (doesn't need to be a cached column given the data volume of personal use).

### 8.2 Category available amount
```
Available(category, month) =
    Available(category, previous month)
  + Assigned(category, month)
  + Activity(category, month)      // activity is already negative when it's spending
```
Base case (a category's first month): `Available(previous month) = 0`.

### 8.3 Loan amortization (monthly estimate)
```
Month's interest = Current outstanding balance × (annual_rate / 12 / 100)
Month's amortization = Monthly payment − Month's interest
New outstanding balance = Current outstanding balance − Month's amortization
```
This calculation runs when the user logs the installment payment (an outflow transaction tied to the loan account), not automatically over time — this avoids drift if the user is late logging a given month.

### 8.4 Net worth
```
Net worth = Σ (balance of all accounts, including tracking)
          − Σ (outstanding balance of credit and loan accounts, already negative, so a direct sum works)
```

---

## 9. Out of Scope (v1)

- Automatic bank syncing (open banking, statement import).
- Multiple users / shared budgets.
- Advanced category goals (target-by-date, automatic recurring funding).
- Scheduled backup with the app closed (requires a custom dev build).
- Support for multiple simultaneous currencies.
- An "age of money" report or equivalent — evaluate real value before implementing.

## 10. Possible Future Roadmap (post-MVP)

- Statement import via file (CSV/OFX) with assisted manual categorization.
- Richer category goals.
- Multi-currency mode.
- Android widget for quick transaction entry.
- Report export as PDF/CSV.
