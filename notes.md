# Country Typeahead

A debounced, keyboard-accessible country search built with Next.js (App Router) and TypeScript.
Data comes from the free api (https://restcountries.com/).

## Running it

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` and start typing (minimum 2 characters).

## What it handles

- **Debounced input** — 300ms debounce (`hooks/useDebouncedValue.ts`) before a request fires.
- **Loading / empty / error states** — explicit `status` state machine renders a distinct UI
  for each. Note the REST Countries API returns HTTP 404 for "no matches" rather than a 200
  with an empty array, so that's normalized to an `empty` state in `lib/countries.ts` rather
  than surfacing as an error.
- **Keyboard navigation** — Arrow Up/Down move the highlighted option, Enter selects it, Escape
  closes the list. Implemented as a `role="combobox"` + `listbox`/`option` pattern using
  `aria-activedescendant`, so keyboard focus stays on the input the whole time (the standard
  accessible combobox pattern) rather than being moved onto list items.
- **Stale / out-of-order responses** — an `AbortController` cancels the previous in-flight
  request whenever a new one fires, and a monotonically increasing request id is checked
  before any response is applied to state, in case an aborted request's promise still
  resolves before the abort is observed.

## Write-up (tradeoffs, scaling, testing)

**Tradeoffs.** I used the REST Countries API because it's free and easy to use, which kept the
demo self-contained, the tradeoff is it has no rate limiting or auth of its own, so some of
the hardening story below is necessarily hypothetical rather than something I exercised
directly. I debounce at 300ms with a 2-character minimum, favoring perceived responsiveness
over minimizing request volume; a flakier network would probably want a longer debounce. For
stale responses I used both an AbortController and a request-id guard rather than either
alone: aborting saves bandwidth, but doesn't guarantee the fetch promise rejects before a
state update lands, so the id check is the actual correctness guarantee. I chose the
`aria-activedescendant` combobox pattern over moving real DOM focus between options since it's
the standard accessible approach and keeps typing uninterrupted.

**Scaling / hardening for high traffic.** I'd add a debounce-aware cache keyed by query string,
since many users typing "Nigeria" would otherwise trigger duplicate upstream calls. I'd route
the fetch through a Next.js API route so I could add server-side rate limiting, response
caching (e.g. Redis with a short TTL), and hide any upstream API key from the client. I'd also
add a circuit breaker/backoff after repeated failures instead of retrying immediately, and
consider a CDN layer in front of the search endpoint if I controlled the upstream API.

**Testing.** Unit test `useDebouncedValue` and the request-id guard logic in isolation with
fake timers. Integration test the component with MSW (Mock Service Worker) to simulate slow,
out-of-order, and error responses, asserting the UI always settles on the latest request's
result. Add a handful of keyboard-interaction tests (arrow keys, Enter, Escape, click-outside)
with React Testing Library, plus one Playwright end-to-end test against the real API as a
smoke test for the integration itself.

## Project structure

```
app/
  layout.tsx        root layout + metadata
  page.tsx           page shell
  globals.css        design tokens + component styles
components/
  CountryTypeahead.tsx   the component itself
hooks/
  useDebouncedValue.ts   generic debounce hook
lib/
  countries.ts           API client, isolated from the component
```
