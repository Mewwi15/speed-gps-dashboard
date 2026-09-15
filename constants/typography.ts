/**
 * Space Grotesk carries the whole interface. Its numerals are near enough to
 * even width that a running clock does not jitter, and it has enough character
 * that the screens do not read as a default UI stack.
 *
 * Weight does the emphasising here. The previous styling leaned on 900 weight,
 * wide letter spacing and faux italics everywhere at once, which flattened the
 * hierarchy: when everything shouts, nothing reads as important.
 */
export const fonts = {
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  semibold: "SpaceGrotesk_600SemiBold",
  bold: "SpaceGrotesk_700Bold",
} as const;

/**
 * Large figures are set tight; small uppercase labels need air to stay legible.
 * Both are far short of the wide tracking used before.
 */
export const tracking = {
  display: -1.4,
  heading: -0.4,
  label: 1,
} as const;
