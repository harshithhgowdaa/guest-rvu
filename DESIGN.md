---
name: RV University Academic Registry
description: A precise, operational attendance system for RV University.
colors:
  charcoal: "#233039"
  teal: "#004854"
  gold: "#D7AC54"
  gold-secondary: "#C29650"
  black: "#000000"
  paper: "#F8F7F3"
typography:
  primary: "Cantarell, Arial, sans-serif"
  display: "Playfair Display, Georgia, serif"
  numerals: "Montserrat, Arial, sans-serif"
---

# RV University Academic Registry

## North star

The product is an academic registry, not an invitation or consumer dashboard. It is composed from a fixed institutional masthead, warm working paper, square controls, precise one-pixel rules, and stable columns. The guest route makes a two-step task obvious; the staff route is a fast, dense attendance register.

## Brand rules

- Use the official name **RV University** exactly.
- Use the full official lockup wherever possible. It may only appear on a dark field; do not recreate, recolour, stretch, crop, or use a gold lockup on white.
- Use **Cantarell** for all written interface language, controls, labels, instructions, and table text.
- Use **Playfair Display** sparingly for the principal page or section heading only.
- Use **Montserrat** only for numerals and data-forward counts.

## Palette

- Charcoal `#233039`: mastheads, institutional authority, high-emphasis type.
- Teal `#004854`: working rails, primary actions, and staff navigation.
- Gold `#D7AC54`, secondary gold `#C29650`: selected state, fine rule, active indicator, and limited emphasis only.
- Black `#000000`: reference text contrast.
- Warm paper `#F8F7F3`: primary working surface.

Do not introduce gradients, glass, cream letterpress ornament, decorative seals, rounded dashboard cards, icon grids, or generic hero metrics.

## Guest check-in

The guest route presents one centered name field and matching roster results. Batch selection and secondary arrival panels are omitted from this route. Guest results stay rule-led, with a selected record marked by a gold inset rule. Confirmation is a flat paper receipt with one restrained check-seal motion.

On small screens, the name field is the primary task. Inputs and actions are at least 44px high, retain a visible gold focus ring, and preserve keyboard operation.

## Staff register

The staff route is an academic records workspace: masthead, teal index rail, a flat three-column total strip, filters, and a full attendance table. Data is organised by rules and alignment rather than cards. On mobile, the table deliberately drops the row number and batch columns so name, status, and checked-in time remain readable without horizontal scrolling.

## Interaction and accessibility

- Use semantic fields, native selects, labelled controls, and live feedback.
- Move focus to the outcome heading after check-in; the outcome is also politely announced.
- Keep transition and confirmation animation disabled for `prefers-reduced-motion`.
- Preserve square controls and one-pixel rules; only status dots and the confirmation seal are circular.
