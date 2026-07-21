import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

// [ForgeOS UI] Registers the jest-axe matcher so tests can assert
// `expect(await axe(container)).toHaveNoViolations()` for the
// "Accessibility tests (axe-core)" requirement in the spec.
expect.extend(toHaveNoViolations);
