"use client";

import { useCallback, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

interface Props {
  initialData: string | null;
  onChange: (json: string) => void;
}

function parseData(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { elements?: unknown[]; appState?: Record<string, unknown> };
    // collaborators must be a Map — Excalidraw v0.18 compatibility
    if (parsed.appState && !(parsed.appState.collaborators instanceof Map)) {
      parsed.appState.collaborators = new Map();
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function ExcalidrawEditor({ initialData, onChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const parsed = parseData(initialData);

  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[]) => {
      if (!apiRef.current) return;
      const appState = apiRef.current.getAppState() as Record<string, unknown>;
      // Strip non-serializable Map before stringify
      const { collaborators: _c, ...serializableAppState } = appState;
      onChange(JSON.stringify({ elements, appState: serializableAppState }));
    },
    [onChange]
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Excalidraw
        excalidrawAPI={(api: unknown) => { apiRef.current = api; }}
        initialData={
          parsed
            ? { elements: (parsed.elements ?? []) as never, appState: parsed.appState ?? {} }
            : undefined
        }
        onChange={handleChange}
        langCode="ko"
      />
    </div>
  );
}
