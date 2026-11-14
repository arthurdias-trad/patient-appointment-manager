// @vitest-environment node
import { NAME_MAX_CHARS, signInSchema, signUpSchema } from "@/lib/auth/schemas";
import { describe, expect, test } from "vitest";
import { z } from "zod";

const valid = {
  firstName: "  Ada ",
  middleName: "  Augusta ",
  lastName: "  Lovelace ",
  email: " ada@example.com ",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
};

describe("signUpSchema", () => {
  test("accepts a 15-character lowercase password (no composition rules)", () => {
    expect(
      signUpSchema.safeParse({
        ...valid,
        password: "a".repeat(15),
        confirmPassword: "a".repeat(15),
      }).success,
    ).toBe(true);
  });

  test("rejects 14 characters", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      password: "a".repeat(14),
      confirmPassword: "a".repeat(14),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.password).toEqual([
        "Password must be at least 15 characters.",
      ]);
    }
  });

  test("counts code points, caps bytes", () => {
    const lock = "🔒"; // 1 code point, 4 bytes
    const withLocks = (n: number) => ({
      ...valid,
      password: lock.repeat(n),
      confirmPassword: lock.repeat(n),
    });

    // 15 code points / 60 bytes
    expect(signUpSchema.safeParse(withLocks(15)).success).toBe(true);
    // 18 code points / 72 bytes
    expect(signUpSchema.safeParse(withLocks(18)).success).toBe(true);

    // 19 code points / 76 bytes
    const tooLong = signUpSchema.safeParse(withLocks(19));
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) {
      expect(z.flattenError(tooLong.error).fieldErrors.password).toEqual([
        "Your password is too long. Please choose a shorter password.",
      ]);
    }
  });

  test("normalizes passwords with NFC", () => {
    const raw = "e\u0301".repeat(15); // Decomposed é
    const signUp = signUpSchema.safeParse({
      ...valid,
      password: raw,
      confirmPassword: raw,
    });
    expect(signUp.success).toBe(true);
    if (signUp.success) {
      expect(signUp.data.password).toBe("é".repeat(15));
    }

    const signIn = signInSchema.safeParse({
      email: "ada@example.com",
      password: raw,
    });
    expect(signIn.success).toBe(true);
    if (signIn.success) {
      expect(signIn.data.password).toBe("é".repeat(15));
    }
  });

  test("reports mismatched confirmation on confirmPassword", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      confirmPassword: "correct horse batterY",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          path: ["confirmPassword"],
          message: "Passwords don't match.",
        }),
      ]);
    }
  });

  test("trims names and email and drops confirmPassword from output", () => {
    const result = signUpSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        firstName: "Ada",
        middleName: "Augusta",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "correct horse battery",
      });
    }
  });

  test.each([undefined, "", "   "])(
    "accepts optional middle name %j",
    (middleName) => {
      const input: Record<string, unknown> = { ...valid };
      if (middleName === undefined) {
        delete input.middleName;
      } else {
        input.middleName = middleName;
      }
      const result = signUpSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.middleName).toBe(
          middleName === undefined ? undefined : "",
        );
      }
    },
  );

  test.each(["firstName", "middleName", "lastName"] as const)(
    "enforces the length limit for %s",
    (field) => {
      expect(
        signUpSchema.safeParse({
          ...valid,
          [field]: ` ${"a".repeat(NAME_MAX_CHARS)} `,
        }).success,
      ).toBe(true);

      const result = signUpSchema.safeParse({
        ...valid,
        [field]: "a".repeat(NAME_MAX_CHARS + 1),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(z.flattenError(result.error).fieldErrors[field]).toEqual([
          `Name cannot exceed ${NAME_MAX_CHARS} characters.`,
        ]);
      }
    },
  );

  test("rejects empty first and last names and an invalid email", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      firstName: "   ",
      lastName: "   ",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error);
      expect(fieldErrors.firstName).toEqual(["Enter your first name."]);
      expect(fieldErrors.lastName).toEqual(["Enter your last name."]);
      expect(fieldErrors.email).toEqual(["Enter a valid email address."]);
    }
  });
});

describe("signInSchema", () => {
  test("sign-in does not re-apply the strength policy", () => {
    expect(
      signInSchema.safeParse({
        email: "ada@example.com",
        password: "12345678",
      }).success,
    ).toBe(true);
  });

  test("rejects an empty password", () => {
    expect(
      signInSchema.safeParse({ email: "ada@example.com", password: "" })
        .success,
    ).toBe(false);
  });
});
