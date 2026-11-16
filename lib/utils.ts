import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register custom font sizes so text color classes don't override them.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "body", "lead", "heading-sm", "heading-md", "heading-lg"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
