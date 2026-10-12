# Font licensing (requirement #19)

| Font | Used for | License | Source | How it's served |
| --- | --- | --- | --- | --- |
| Manrope | Latin text (EN/FR) | SIL Open Font License 1.1 | github.com/sharanda/manrope | Self-hosted by `next/font/google` at build time |
| IBM Plex Sans Arabic | Arabic text | SIL Open Font License 1.1 | github.com/IBM/plex | Self-hosted by `next/font/google` at build time |
| System UI stack | Fallback | n/a (the visitor's own fonts) | — | — |

The OFL allows commercial use, embedding and self-hosting. It forbids selling the fonts by themselves and reusing the Reserved Font Names for modified versions. We don't modify or redistribute them separately.

`next/font` downloads the files during `next build` and serves them from our own domain, so visitors' browsers never contact Google Fonts. The CSP enforces this with `font-src 'self'`.

If you swap fonts, check the license first and update this file.
