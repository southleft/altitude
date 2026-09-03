---
title: "Token Naming Conventions: The Key to a Scalable Design System"
date: 2024-05-03
category: "design-systems"
categoryName: "Design Systems"
excerpt: "Discover the power of structured token naming conventions in building a scalable, consistent, and collaborative design system across all tiers."
hero: "https://southleft.pages.dev/media/altitude-style-dictionary-json.webp"
---

Design systems thrive on consistency. For designers, developers, and product managers alike, a cohesive visual language across digital products is essential for building user trust and streamlining development processes. One critical aspect of achieving this consistency lies in adopting well-thought-out token naming conventions. This guide will discuss the significance of structured naming conventions across various tiers of tokens within a design system.

## Tier 1 Naming: Establishing the Foundation

The core of any design system consists of Tier 1 tokens. These foundational elements pave the way for scalability and adaptability. Implementing a clear and structured naming convention for Tier 1 tokens is crucial for the overall success of your design system.

For instance, consider icon sizes. Utilizing descriptive names like `icon/8` for an `8px` icon size clarifies the token’s purpose and enables seamless expansion. As your design system evolves with the introduction of new values, the existing structure remains intact, ensuring scalability without causing confusion or disruption.

```json
{
  "icon": {
    "8": {
      "value": "8px",
      "type": "sizing"
    },
    "12": {
      "value": "12px",
      "type": "sizing"
    },
    "16": {
      "value": "16px",
      "type": "sizing"
    },
    "18": {
      "value": "18px",
      "type": "sizing"
    }
  }
}
```

Moreover, prefixing token sets with identifiers, such as `icon/`, significantly aids in organizing JSON files, essential for developers. This organization makes it easy for developers to locate and manage specific sets of tokens within the files, especially when handling a large number of tokens.

In summary, adopting a clear naming convention and using prefixed identifiers for Tier 1 tokens is vital for the long-term success of a design system, as it facilitates seamless expansion, simplifies organization for developers, and fosters a scalable and efficient design environment.

## Tier 2 Naming: Adding Semantic Meaning

Advancing up the hierarchy, Tier 2 tokens bring in semantic naming structures enriched with symbols and descriptive terms. This practice considerably improves clarity, conciseness, and organization within a design system.

Semantic naming structures make tokens more intuitive and easier to understand for both designers and developers. For example, using the `@` symbol to define default values aids in maintaining concise token names while effectively indicating default values. Similarly, incorporating descriptive terms like `xs` and `lg` for sizing tokens offers a quick and visual representation of the intended size, streamlining communication, and reducing the likelihood of errors.

```json
{ 
  "theme": {
    "icon": {
      "xs": {
        "value": "{icon.8}",
        "type": "sizing"
      },
      "sm": {
        "value": "{icon.12}",
        "type": "sizing"
      },
      "@": {
        "value": "{icon.16}",
        "type": "sizing"
      },
      "md": {
        "value": "{icon.20}",
        "type": "sizing"
      }
    }
  }
}
```

Adopting a semantic naming structure with symbols and descriptive terms in Tier 2 tokens provides significant benefits. It promotes a design system that is both intuitive and adaptable, resulting in efficient communication and collaboration. This clarity establishes a solid foundation for scalability and ease of maintenance as the design system evolves over time.

## Tier 3 Naming: Enhancing Specificity

Tier 3 naming focuses on enhancing specificity and granularity within the design system. This level of granularity is increasingly important because it allows designers and developers to precisely define and control design elements’ nuances, ensuring alignment with the user experience and brand identity.

In Tier 3, tokens provide fine-tuned control over various aspects, such as layout, typography, and interaction behaviors. Embracing a structured approach to Tier 3 naming ensures clarity, consistency, and maintainability across all levels of tokenization, laying a solid foundation for the design system’s scalability and long-term success.

```json
{
  "theme": {
    "icon": {
      "button": "{theme.icon.lg}"
    }
  }
}
```

Consider a practical example: defining color tokens for buttons. By incorporating descriptive terms like `hover` and `disabled` within the token names, designers offer clear guidance on the intended usage and behavior. This empowers developers to implement these styles accurately.

```json
{
  "theme": {
     "color": {
       "button": {
         "background": {
           "@": {
             "value": "{theme.color.background.primary.default}"
           },
           "hover": {
             "value": "{theme.color.background.primary.weak}"
           },
           "active": {
             "value": "{theme.color.background.primary.weaker}"
           },
           "disabled": {
             "value": "{theme.color.background.disabled.default}"
           }
         },
         "content": {
           "@": {
             "value": "{theme.color.content.neutral-default}"
           },
           "hover": {
             "value": "{theme.color.content.neutral-default}"
           },
           "active": {
             "value": "{theme.color.content.neutral-default}"
           },
           "disabled": {
             "value": "{theme.color.content.disabled.default}"
          }
        }
      }
    }
  }
}
```

## Conclusion

Ultimately, structured token naming conventions serve as the backbone of a robust design system. By establishing clear naming conventions across different token tiers, you pave the way for consistency, scalability, and collaboration within your design and development teams. Whether starting with Tier 1 tokens or refining the granularity of Tier 3, remember that thoughtful naming is instrumental in unlocking the full potential of your design system.
