import { z } from "zod";

export const PASSWORD_MIN_CHARS = 15;
export const PASSWORD_MAX_BYTES = 72;
export const NAME_MAX_CHARS = 100;

const encoder = new TextEncoder();

const nameSchema = z
  .string()
  .trim()
  .max(NAME_MAX_CHARS, `Name cannot exceed ${NAME_MAX_CHARS} characters.`);

const firstNameSchema = nameSchema.min(1, "Enter your first name.");
const middleNameSchema = nameSchema.optional();
const lastNameSchema = nameSchema.min(1, "Enter your last name.");

const emailSchema = z
  .string()
  .trim()
  .pipe(z.email({ error: "Enter a valid email address." }));

const passwordBytesMessage =
  "Your password is too long. Please choose a shorter password.";

const passwordSchema = z
  .string()
  .normalize("NFC")
  .refine(
    (s) => [...s].length >= PASSWORD_MIN_CHARS,
    "Password must be at least 15 characters.",
  )
  .refine(
    (s) => encoder.encode(s).length <= PASSWORD_MAX_BYTES,
    passwordBytesMessage,
  );

const loginPasswordSchema = z
  .string()
  .normalize("NFC")
  .min(1, "Enter your password.")
  .refine(
    (s) => encoder.encode(s).length <= PASSWORD_MAX_BYTES,
    passwordBytesMessage,
  );

export const signUpSchema = z
  .object({
    firstName: firstNameSchema,
    middleName: middleNameSchema,
    lastName: lastNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().normalize("NFC"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords don't match.",
      });
    }
  })
  .transform(({ firstName, middleName, lastName, email, password }) => ({
    firstName,
    middleName,
    lastName,
    email,
    password,
  }));

export const signInSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type SignUpInput = z.output<typeof signUpSchema>;
export type SignInInput = z.output<typeof signInSchema>;
