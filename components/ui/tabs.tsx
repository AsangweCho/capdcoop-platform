"use client";

import * as React from "react";

type TabsContextType = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextType | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used inside <Tabs>");
  }
  return context;
}

interface TabsProps {
  value: string;
  onValueChange: React.Dispatch<React.SetStateAction<any>>;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  value,
  onValueChange,
  children,
  className = "",
}: TabsProps) {
  return (
    <TabsContext.Provider
      value={{
        value,
        setValue: onValueChange,
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({
  children,
  className = "",
}: TabsListProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm border ${className}`}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({
  value,
  children,
  className = "",
}: TabsTriggerProps) {
  const { value: activeValue, setValue } = useTabsContext();

  const isActive = activeValue === value;

  return (
    <button
      onClick={() => setValue(value)}
      className={`rounded-lg px-5 py-2 text-sm font-bold transition-all ${
        isActive
          ? "bg-[#0D2D6E] text-white shadow"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({
  value,
  children,
  className = "",
}: TabsContentProps) {
  const { value: activeValue } = useTabsContext();

  if (activeValue !== value) return null;

  return <div className={className}>{children}</div>;
}