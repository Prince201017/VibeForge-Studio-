/**
 * [ForgeOS UI] Shared test helpers: an axe-core runner used across the
 * suite to assert zero accessibility violations per component.
 */
import { axe } from "jest-axe";
import type { RenderResult } from "@testing-library/react";

export async function expectNoA11yViolations(result: RenderResult) {
  const results = await axe(result.container);
  expect(results).toHaveNoViolations();
}
