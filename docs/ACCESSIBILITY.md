# Accessibility (target: WCAG 2.2 AA)

## Contrast (computed, not eyeballed)

| Token | Hex | On white | On canvas `#f7f6f2` | Use |
| --- | --- | --- | --- | --- |
| ink | #101828 | 17.7:1 | 16.4:1 | Body text |
| ink-2 | #344054 | 10.5:1 | 9.7:1 | Secondary text |
| muted | #475467 | 7.7:1 | 7.1:1 | Lightest text colour allowed |
| pine (primary) | #0b5c47 | 8.0:1 | 7.4:1 | Buttons (white text 8:1), links |
| control | #667085 | 4.8:1 | — | Form-control borders (≥ 3:1) |
| star | #c27803 | 3.5:1 | 3.25:1 | Filled stars (graphic, ≥ 3:1) |
| danger | #b42318 | 6.6:1 | 6.1:1 | Errors (always with icon + text) |
| focus | #1d4ed8 | 6.7:1 | 6.2:1 | 3px focus ring |

Business brand colours are user input. `ensureAccessibleBrand()` darkens any colour until white text on it reaches 4.5:1, and invalid values fall back to pine.

## Patterns used

- **Star rating**: native radio inputs in a `fieldset` with a `legend`. Each option is labelled "Rating: N out of 5 stars". Arrow keys work natively, and a visible number under each star plus a live text summary ("4 out of 5 — Good") mean meaning never relies on colour. Targets are at least 57×68px.
- **Errors**: `aria-invalid` + `aria-describedby`, an icon + text. The form summary gets focus and is announced (`role="alert"`). Successful submission moves focus to the confirmation heading.
- **Dialogs** (cookie settings, confirmations, mobile nav): native `<dialog>` with `showModal()`. The browser traps focus, Escape closes, and focus returns to the opener.
- **Charts**: single-series charts with a text title. The time series is keyboard-explorable (focus, then ←/→/Home/End) and has a full data table. Bars are directly labelled with their values.
- **Navigation**: skip link, `aria-current` on the current page, visible 3px focus ring, logical tab order, and no keyboard traps.
- **Motion**: subtle entrance animations only, disabled under `prefers-reduced-motion`.
- **RTL**: `dir="rtl"` for Arabic. Layout uses logical properties (`ms-`, `ps-`, `start-`, `text-start`), and directional icons are mirrored. Phone numbers and URLs keep `dir="ltr"`.
- **Images**: business logos use the business's alt text (or its name). Decorative SVGs are `aria-hidden`. QR images have descriptive alt text.
- **Forms**: visible labels, `autocomplete` attributes, no placeholder-only labels, and optional fields are marked.

## Testing

- `tests/e2e/*.spec.ts` runs axe-core (WCAG 2.0/2.1/2.2 A+AA tags) on the customer page in EN/FR/AR, every public page and every dashboard section.
- Keyboard-only completion of the customer flow is tested end to end.
- Still to do by hand before launch: screen-reader pass with VoiceOver (iOS) and TalkBack (Android), 200% zoom and text spacing.
