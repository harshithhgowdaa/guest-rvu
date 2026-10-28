"use client";

import * as React from "react";
import { BorderBeam, type BorderBeamColorVariant } from "border-beam";
import { Search, X } from "lucide-react";

export interface BeamSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  id?: string;
  ariaControls?: string;
  ariaExpanded?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onEscape?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  colorVariant?: BorderBeamColorVariant;
}

export function BeamSearch({
  value,
  onChange,
  onClear,
  placeholder = "Search…",
  id,
  ariaControls,
  ariaExpanded,
  onFocus,
  onBlur,
  onEscape,
  inputRef,
  colorVariant = "gold",
}: BeamSearchProps) {
  const [focused, setFocused] = React.useState(false);

  function clear() {
    onChange("");
    onClear?.();
  }

  return (
    <BorderBeam
      size="line"
      colorVariant={colorVariant}
      theme="light"
      staticColors
      active={focused}
      duration={2.4}
      strength={0.62}
      glowSize={0.72}
      className="guest-search-beam"
    >
      <label className="guest-search-field" htmlFor={id}>
        <Search className="guest-search-field__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={ariaControls}
          aria-expanded={ariaExpanded}
          value={value}
          placeholder={placeholder}
          autoComplete="name"
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => { setFocused(true); onFocus?.(); }}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && value) {
              event.preventDefault();
              clear();
              onEscape?.();
            }
          }}
        />
        {value ? (
          <button
            className="guest-search-field__clear"
            type="button"
            aria-label="Clear name search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </label>
    </BorderBeam>
  );
}
