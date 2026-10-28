"use client";

import * as React from "react";
import { BorderBeam, type BorderBeamColorVariant } from "border-beam";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useSurfaceTheme,
  type SurfaceTheme,
} from "@/components/ui/beam-search-utils/use-surface-theme";

export interface BeamSearchProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onClear?: () => void;
  onEscape?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  alwaysOn?: boolean;
  colorVariant?: BorderBeamColorVariant;
  theme?: SurfaceTheme;
  trailing?: React.ReactNode;
  className?: string;
  id?: string;
  ariaControls?: string;
  ariaExpanded?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

const CHARCOAL_BEAM_CSS = `
  [data-beam="{id}"][data-active]::after,
  [data-beam="{id}"][data-fading]::after {
    background: radial-gradient(
      ellipse calc(84px * var(--beam-w-{id})) calc(22px * var(--beam-h-{id}))
      at calc(var(--beam-x-{id}) * 100%) 100%,
      #233039 0%, #3f4b53 32%, rgba(80, 93, 101, 0.58) 58%, transparent 100%
    );
  }

  [data-beam="{id}"][data-active]::before,
  [data-beam="{id}"][data-fading]::before {
    background: radial-gradient(
      ellipse calc(92px * var(--beam-w-{id})) calc(28px * var(--beam-h-{id}))
      at calc(var(--beam-x-{id}) * 100%) 100%,
      rgba(35, 48, 57, 0.62) 0%, rgba(63, 75, 83, 0.3) 48%, transparent 100%
    );
    box-shadow: none;
  }

  [data-beam="{id}"] [data-beam-bloom] {
    background: radial-gradient(
      ellipse calc(104px * var(--beam-w-{id})) calc(34px * var(--beam-h-{id}))
      at calc(var(--beam-x-{id}) * 100%) 100%,
      rgba(35, 48, 57, 0.34), rgba(63, 75, 83, 0.15) 48%, transparent 76%
    );
    filter: blur(6px);
  }
`;

export function BeamSearch({
  value,
  defaultValue = "",
  onChange,
  onSubmit,
  onClear,
  onEscape,
  onFocus,
  onBlur,
  placeholder = "Search…",
  alwaysOn = false,
  colorVariant = "mono",
  theme = "auto",
  trailing,
  className,
  id,
  ariaControls,
  ariaExpanded,
  inputRef,
}: BeamSearchProps) {
  const resolved = useSurfaceTheme(theme);
  const [inner, setInner] = React.useState(defaultValue);
  const [focused, setFocused] = React.useState(false);
  const localInputRef = React.useRef<HTMLInputElement>(null);
  const current = value ?? inner;

  const setInputRef = React.useCallback((node: HTMLInputElement | null) => {
    localInputRef.current = node;
    if (typeof inputRef === "function") inputRef(node);
    else if (inputRef) inputRef.current = node;
  }, [inputRef]);

  const update = (next: string) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };

  const clear = () => {
    update("");
    onClear?.();
    localInputRef.current?.focus();
  };

  return (
    <BorderBeam
      size="line"
      colorVariant={colorVariant}
      theme={resolved}
      staticColors
      active={alwaysOn || focused}
      strength={1}
      duration={3.1}
      glowSize={0.72}
      css={CHARCOAL_BEAM_CSS}
      className={cn("guest-search-beam w-full", className)}
    >
      <label
        className={cn(
          "guest-search-field flex h-14 w-full items-center gap-3 rounded-xl border border-black/15 bg-[#EFEFEE] px-3.5 transition-colors",
          focused && "border-[#233039]/35",
        )}
        htmlFor={id}
      >
        <Search className="size-4 shrink-0 text-[#526069]" aria-hidden />
        <input
          ref={setInputRef}
          id={id}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={ariaControls}
          aria-expanded={ariaExpanded}
          value={current}
          placeholder={placeholder}
          autoComplete="name"
          onChange={(event) => update(event.target.value)}
          onFocus={() => { setFocused(true); onFocus?.(); }}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit?.(current);
            if (event.key === "Escape") {
              update("");
              onClear?.();
              onEscape?.();
            }
          }}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[#233039] outline-none placeholder:text-[#66737B] [&::-webkit-search-cancel-button]:hidden"
        />
        {current ? (
          <button
            type="button"
            aria-label="Clear name search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            className="guest-search-field__clear flex size-8 shrink-0 items-center justify-center rounded-full text-[#66737B] transition-colors hover:bg-black/5 hover:text-[#233039]"
          >
            <X className="size-3.5" />
          </button>
        ) : trailing}
      </label>
    </BorderBeam>
  );
}

export default BeamSearch;
