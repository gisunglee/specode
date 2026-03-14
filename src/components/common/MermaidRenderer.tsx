"use client";

import { useEffect, useRef } from "react";

interface MermaidRendererProps {
  code: string;
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code || !ref.current) return;

    const id = `mermaid-${Date.now()}`;
    import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, theme: "neutral" });
      m.default
        .render(id, code)
        .then(({ svg }) => {
          if (ref.current) ref.current.innerHTML = svg;
        })
        .catch(() => {
          if (ref.current) {
            ref.current.innerHTML = `<pre class="text-xs text-destructive whitespace-pre-wrap p-2">${code}</pre>`;
          }
        });
    });
  }, [code]);

  return <div ref={ref} className="p-4 overflow-auto" />;
}
