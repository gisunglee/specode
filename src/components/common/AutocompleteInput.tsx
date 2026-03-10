"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface AutocompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  label?: string;
  id?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  label,
  id,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions;

  return (
    <div className="relative space-y-1">
      {label && (
        <label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </label>
      )}
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-0.5 border border-border bg-popover rounded-md shadow-md max-h-48 overflow-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onMouseDown={() => onChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
