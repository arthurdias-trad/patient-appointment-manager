// @vitest-environment node
import { cn } from "@/lib/utils";
import { expect, test } from "vitest";

test("cn keeps custom font sizes alongside text colors", () => {
  expect(cn("text-body", "text-primary-foreground")).toBe(
    "text-body text-primary-foreground",
  );
  expect(cn("text-caption", "text-body")).toBe("text-body");
});
