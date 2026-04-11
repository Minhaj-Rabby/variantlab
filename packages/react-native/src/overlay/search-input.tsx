/**
 * Tiny controlled search input used in the overlay.
 *
 * The component is intentionally dumb — it owns no state, debounces
 * nothing, and forwards every keystroke straight to the parent. The
 * parent (`<VariantDebugOverlay>`) handles debouncing through a
 * setTimeout-backed wrapper so the same logic powers both the search
 * box and the route picker.
 */
import type { ReactElement } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { OverlayTheme } from "./theme.js";

export interface SearchInputProps {
  theme: OverlayTheme;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  theme,
  value,
  onChange,
  placeholder,
}: SearchInputProps): ReactElement {
  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TextInput
        accessibilityLabel="Filter experiments"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? "Search experiments…"}
        placeholderTextColor={theme.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.input, { color: theme.text }]}
        testID="variantlab-search-input"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  input: {
    fontSize: 14,
    paddingVertical: 4,
  },
});
