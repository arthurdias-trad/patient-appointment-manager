import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md py-2 text-body font-semibold whitespace-nowrap transition-colors duration-(--motion-enter) disabled:pointer-events-none disabled:opacity-65 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        outline:
          "border border-primary bg-card text-primary hover:bg-accent active:bg-secondary",
        ghost: "text-primary hover:bg-accent active:bg-secondary",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-90 active:brightness-75",
        ghostDestructive:
          "text-destructive hover:bg-destructive-bg active:bg-destructive-bg",
      },
      size: {
        default: "min-h-12 px-6",
        sm: "min-h-11 px-4",
        icon: "size-12 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
