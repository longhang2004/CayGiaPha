# Heritage Homepage Design

## Intent

Replace the short homepage with a long, illustration-first landing page for the family member who starts and organizes a tree. The visual language is warm editorial heritage: cream surfaces, the existing terracotta accent, olive support tones, generous reading rhythm, and one generated Vietnamese multigenerational-family image.

## Experience contract

- Production and `/prototype/home` render the same `HomeLanding` component.
- `HomeLanding` receives `loading`, `signed-out`, or `signed-in`; only the primary account action changes between states.
- The reading order is header, hero, value strip, practical problem, three starting actions, four feature stories, Vietnamese kinship, privacy, audiences, FAQ, closing CTA, and footer.
- Marketing navigation uses absolute home anchors so it works from both the homepage and `/help`.
- The hero and Open Graph metadata use the same wide generated image. Feature sections use stable conceptual HTML/CSS visuals, never product screenshots.
- The footer contains product, support, and legal groups. Settings contains a shared legal-and-privacy card before data rights.
- Motion is limited to CSS opacity/transform reveals and hover feedback, and is disabled when reduced motion is requested or `animated` is false.
- The page supports the existing light/dark themes, text scale up to 200%, keyboard focus, mobile single-column collapse, and no horizontal overflow.

## Content guardrails

- Describe only capabilities already present in the product.
- Early access may be described as free, without inventing future pricing.
- Do not add customer logos, testimonials, adoption statistics, or unsupported privacy promises.
- Explain kinship calculation conditionally: it depends on the available relationship path and the selected regional vocabulary.
- Run marketing copy through a draft, AI-tell audit, and final humanized rewrite. Canonical legal documents are excluded from rewriting.

## Visual dials

- Design variance: 7
- Motion intensity: 4
- Visual density: 4
- Design system: existing CGP native SCSS and semantic tokens
- Theme: automatic, with no mid-page theme inversion
