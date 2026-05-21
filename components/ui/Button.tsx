import React from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button className={["button", `button-${variant}`, className].filter(Boolean).join(" ")} type="button" {...props}>
      {children}
    </button>
  );
}
