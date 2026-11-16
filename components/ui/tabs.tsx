"use client";

import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-6", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex items-end gap-3 border-b border-border sm:gap-6",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  children,
  onPointerDown,
  onKeyDown,
  onBlur,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "group -mb-px inline-flex min-h-11 items-center border-b-3 border-transparent pt-2 pb-3 text-caption font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors duration-(--motion-enter) hover:text-primary disabled:pointer-events-none disabled:opacity-65 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary sm:text-body",
        className,
      )}
      // Radix focuses the trigger from script on mousedown, which Chrome can
      // style as keyboard focus. Hide the ring until the next key press.
      onPointerDown={(event) => {
        event.currentTarget.dataset.pointerFocus = "";
        onPointerDown?.(event);
      }}
      onKeyDown={(event) => {
        delete event.currentTarget.dataset.pointerFocus;
        onKeyDown?.(event);
      }}
      onBlur={(event) => {
        delete event.currentTarget.dataset.pointerFocus;
        onBlur?.(event);
      }}
      {...props}
    >
      <span className="-mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring group-data-pointer-focus:outline-none">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 rounded-md", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
