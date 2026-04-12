/**
 * Tiny controlled search input used in the overlay.
 *
 * The component is intentionally dumb — it owns no state, debounces
 * nothing, and forwards every keystroke straight to the parent.
 */
import type { CSSProperties, ReactElement } from "react";
import type { OverlayTheme } from "./theme.js";

export interface SearchInputProps {
  theme: OverlayTheme;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
}

export function SearchInput({
  theme,
  value,
  onChange,
  placeholder,
}: SearchInputProps): ReactElement {
  return (
    <div
      style={{
        ...styles.wrapper,
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <input
        type="text"
        aria-label="Filter experiments"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search experiments\u2026"}
        data-testid="variantlab-search-input"
        style={{
          ...styles.input,
          color: theme.text,
        }}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 6,
    paddingBottom: 6,
  },
  input: {
    fontSize: 14,
    paddingTop: 4,
    paddingBottom: 4,
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "inherit",
  },
} satisfies Record<string, CSSProperties>;
