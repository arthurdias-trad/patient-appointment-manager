"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotice } from "../notice";
import {
  APPOINTMENT_TABS,
  parseTab,
  type AppointmentTab,
} from "./_lib/phase";

const labels: Record<AppointmentTab, string> = {
  upcoming: "Upcoming",
  past: "Past",
  cancelled: "Cancelled",
};

type AppointmentTabsProps = {
  counts: Record<AppointmentTab, number>;
  panels: Record<AppointmentTab, ReactNode>;
};

export function AppointmentTabs({ counts, panels }: AppointmentTabsProps) {
  const pathname = usePathname();
  const tab = parseTab(useSearchParams().get("tab"));
  const { clearNotice } = useNotice();
  const previousTab = useRef(tab);

  // Back/Forward change the tab without onValueChange, so clear here.
  useEffect(() => {
    if (previousTab.current === tab) return;
    previousTab.current = tab;
    clearNotice();
  }, [tab, clearNotice]);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = parseTab(value);
        const href = next === "upcoming" ? pathname : `${pathname}?tab=${next}`;
        // Radix selects on both mousedown and focus; push one entry per change.
        if (href !== location.pathname + location.search) {
          history.pushState(null, "", href);
        }
      }}
    >
      <TabsList aria-label="Appointments">
        {APPOINTMENT_TABS.map((value) => (
          <TabsTrigger key={value} value={value}>
            {labels[value]}
            <span className="sr-only">, </span>
            <span className="rounded-full bg-muted px-1.5 text-caption font-semibold text-muted-foreground">
              {counts[value]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {APPOINTMENT_TABS.map((value) => (
        <TabsContent key={value} value={value}>
          {panels[value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
