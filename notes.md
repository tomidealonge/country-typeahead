A debounced, keyboard-accessible country search built with Next.js (App Router) and TypeScript. Data comes from the free api (https://restcountries.com/).

Running it
npm install
npm run dev

Then open http://localhost:3000 and start typing (minimum 2 characters).

This implementation prioritizes a responsive and accessible search experience. A 300 ms debounce and two-character minimum reduce unnecessary requests while keeping interaction fast. The client uses AbortController to cancel obsolete requests, while a monotonically increasing request ID prevents stale responses from updating the UI if cancellation races with a completed request. Keyboard navigation uses the ARIA combobox/listbox pattern, keeping focus in the input and scrolling the active option into view. The tradeoff is additional state and coordination between the component, client helper, and server route, but this provides stronger accessibility and predictable behavior.

For high traffic, I would add server-side caching keyed by normalized query, with a short TTL and possibly Redis for sharing cached results across instances. Rate limiting per client or IP would protect both the application and upstream API. Retries should be limited and use exponential backoff, with a circuit breaker to avoid amplifying outages. The API key should remain in deployment secrets and be rotated regularly.

Testing would include unit tests for debounce timing, query normalization, response mapping, and stale-request protection. Component tests with React Testing Library and mocked fetch responses should cover loading, empty, error, keyboard selection, Escape, mouse selection, and scrolling behavior. Integration tests should verify the Next.js route, including missing credentials and upstream 404 responses. A small Playwright smoke test could confirm the complete search flow in a browser.

