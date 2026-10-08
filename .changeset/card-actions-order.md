---
"@southleft/al-web-components": patch
---

fix(card): the actions row renders below the body, and a lone `actions-end` group keeps the trailing edge. The template had rendered the actions region first, so in the default layout it sat above the image and the heading; only the inline layout had an `order` rule.
