import React from "react";
import type { ReactNode } from "react";

type CardProps = {
  title: string;
  meta?: string;
  children: ReactNode;
};

export function Card({ title, meta, children }: CardProps) {
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        {meta ? <span className="card-meta">{meta}</span> : null}
      </div>
      {children}
    </article>
  );
}
