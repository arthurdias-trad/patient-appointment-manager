// @vitest-environment node
import { displayNameFor, initialsFor } from "@/lib/profiles/display-name";
import { expect, test } from "vitest";

const empty = { firstName: null, middleName: null, lastName: null };
const jamieLee = { firstName: "Jamie", middleName: null, lastName: "Lee" };

test("displayNameFor joins the non-empty name parts", () => {
  expect(displayNameFor(jamieLee)).toBe("Jamie Lee");
  expect(
    displayNameFor({ firstName: " Jamie ", middleName: "  ", lastName: "Lee" }),
  ).toBe("Jamie Lee");
});

test("displayNameFor returns null without a name", () => {
  expect(displayNameFor(empty)).toBeNull();
  expect(
    displayNameFor({ firstName: " ", middleName: "", lastName: "  " }),
  ).toBeNull();
});

test("initialsFor uses the first and last initials", () => {
  expect(initialsFor(jamieLee)).toBe("JL");
  expect(initialsFor({ ...empty, firstName: "jamie" })).toBe("J");
  expect(initialsFor(empty)).toBeNull();
  expect(initialsFor({ ...empty, firstName: "𠮷野", lastName: "Lee" })).toBe(
    "𠮷L",
  );
});
