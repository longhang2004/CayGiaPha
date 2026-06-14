import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees that were mounted with render after every test so that
// component tests stay isolated from one another.
afterEach(() => {
  cleanup();
});
