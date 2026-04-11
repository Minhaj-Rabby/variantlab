/**
 * Vitest global setup for the React project.
 *
 * Registers `afterEach(cleanup)` so that Testing Library's rendered
 * trees are torn down between tests — without it, stale DOM from a
 * previous test can leak into the next one and cause flaky failures.
 */

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
