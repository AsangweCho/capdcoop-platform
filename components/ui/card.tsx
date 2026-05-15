import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ children, className = "", ...props }: DivProps) {
  return (
    <div
      className={`rounded-[2rem] border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: DivProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}