"use client";

import { useEffect, useRef } from "react";

interface MermaidRendererProps {
  code: string;
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    if (!code?.trim()) {
      container.innerHTML = "";
      return;
    }

    let cancelled = false;

    import("mermaid").then(async (mod) => {
      if (cancelled) return;

      const mermaid = mod.default;
      mermaid.initialize({ startOnLoad: false, theme: "neutral" });

      // mermaid.run()은 .mermaid 클래스 요소를 찾아 SVG로 교체
      const pre = document.createElement("pre");
      pre.className = "mermaid";
      pre.textContent = code;

      container.innerHTML = "";
      container.appendChild(pre);

      try {
        await mermaid.run({ nodes: [pre] });
      } catch (err) {
        if (!cancelled && container) {
          container.innerHTML = `<pre style="color:red;font-size:12px;white-space:pre-wrap;padding:8px">${String(err)}</pre>`;
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  return <div ref={ref} className="p-4 overflow-auto" />;
}
