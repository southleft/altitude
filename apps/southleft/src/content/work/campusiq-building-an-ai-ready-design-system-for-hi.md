---
title: "CampusIQ: Building an AI-Ready Design System for Higher Education Technology"
client: "CampusIQ"
date: 2026-02-11
oneLiner: "A context-based, token-first design system that unified three component libraries into 50+ React components with AI-integrated workflows."
summary: "CampusIQ, an AI-powered space utilization analytics company for universities, had scaled from 5 to 20 employees with three different component libraries and no shared design language — so AI-generated code from tools like Claude Code and Cursor came out inconsistent. Southleft built a context-based design system on shadcn/ui with a CSS custom property token architecture powering Tailwind across all products, including full dark mode. The design-to-development workflow runs on Figma Console MCP and Story UI, Southleft's own open-source tools that give AI full awareness of the design system."
capabilities: ["AI + Design Systems","Design Systems","Front-End Development","React"]
industry: "Higher Education Technology"
hero: "https://southleft.pages.dev/media/campusiq-design-token-architecture.webp"
showHero: true
featured: false
---

<h2 class="wp-block-heading"><strong>Bridging the Gap Between Design and AI</strong></h2>
<p><a href="https://campusiq.com/">CampusIQ</a> provides AI-powered space utilization analytics for universities. After securing funding and scaling from 5 to 20 employees, they needed design consistency across two products: SpaceWalker and Space Utilization.</p>
<p>Their engineering team was already using AI tools like <a href="https://code.claude.com/docs/en/overview">Claude Code</a> and <a href="https://cursor.com/">Cursor</a>, but without a structured design system, AI-generated code was inconsistent. Three different component libraries across products with no shared design language or formal handoff process.</p>
<p>The gap wasn’t technical capability—it was <strong>contextual continuity</strong>.</p>
<figure class="wp-block-image size-large"><img loading="lazy" decoding="async" width="1400" height="651" src="https://southleft.pages.dev/media/campusiq-design-token-architecture.webp" alt="CampusIQ design token architecture showing CSS custom properties bridging Figma variables and production code" class="wp-image-3399"><figcaption class="wp-element-caption">Token architecture using CSS custom properties as a universal bridge between Figma design variables and production code across all CampusIQ products.</figcaption></figure>
<section class="c-split-media-content l-wrap o-browser c-split-media-content--media-right c-split-media-content--sticky has-fade-up">
<div class="c-split-media-content__container l-container u-spacing--xl">
<div class="c-split-media-content__group">
<div class="c-split-media-content__media u-spacing--xl">
<div class="c-split-media-content__media-group">
<div class="c-split-media-content__image">
<figure class="o-figure">
<img decoding="async" class="o-image" src="https://southleft.pages.dev/media/campusiq-figma-variables-panel.webp" alt="Figma variables panel showing CampusIQ semantic color tokens synchronized between design and code">
<figcaption class="o-figure__caption o-caption">Figma variables panel with semantic color tokens bridging design and code — the single source of truth for the entire system.</figcaption>
</figure>
</div>

</div>
</div>
<div class="c-split-media-content__content c-split-media-content__content--wide">
<div class="c-split-media-content__copy-block">
<div class="o-rich-text c-split-media-content__rich-text">
<h2 id="h-a-token-first-architecture" class="wp-block-heading">A Token-First Architecture</h2>
<p>We built a context-based design system using shadcn/ui as the foundation, chosen specifically for its compatibility with AI workflows and modern development practices. Our design systems engineer, <a href="https://blog.murphytrueman.com/">Murphy Trueman</a>, worked directly with CampusIQ’s product director to build fluency in design system fundamentals and token architectures — then configured an advanced token system using CSS custom properties that powers the Tailwind CSS implementation across all products. The result: a single source of truth spanning core brand identity, semantic color scales, system-wide spacing and typography, and full dark mode support with automatic theme switching.</p>
</div>
</div>
</div>
</div>
</div>
</section>
<section class="c-split-media-content l-wrap o-browser c-split-media-content--media-left c-split-media-content--sticky has-fade-up">
<div class="c-split-media-content__container l-container u-spacing--xl">
<div class="c-split-media-content__group">
<div class="c-split-media-content__media u-spacing--xl">
<div class="c-split-media-content__media-group">
<div class="c-split-media-content__image">
<figure class="o-figure">
<img decoding="async" class="o-image" src="https://southleft.pages.dev/media/image-40.webp" alt="CampusIQ Storybook instance with Story UI integration.">
<figcaption class="o-figure__caption o-caption">CampusIQ Storybook instance with Story UI integration. </figcaption>
</figure>
</div>

</div>
</div>
<div class="c-split-media-content__content c-split-media-content__content--wide">
<div class="c-split-media-content__copy-block">
<div class="o-rich-text c-split-media-content__rich-text">
<h2 class="wp-block-heading"><strong>AI-Integrated Design Workflow</strong></h2>
<p>The design-to-development workflow leverages <a href="https://figma-console-mcp.southleft.com/">Figma Console MCP</a>, an open-source tool we built that gives AI full awareness of the design system. Developers use Claude Code with MCP integration to analyze differences between Figma specifications and current code, understand component intent from embedded documentation, and generate implementation with full context.</p>
<p>We also deployed <a href="/insights/design-systems/introducing-story-ui-accelerating-layout-generation-with-ai-mcp/">Story UI</a>, enabling the product team to prototype layouts using actual production components without developer involvement. It generates functional code that can be reviewed and implemented directly.</p>
</div>
</div>
</div>
</div>
</div>
</section>
<h2 class="wp-block-heading" id="h-components-built-for-scale"><strong>Components Built for Scale</strong></h2>
<p>The production component library delivers 50+ components built with React 19, TypeScript, and Tailwind CSS v4 — covering forms, navigation, feedback, and data display. Every component includes semantic color variants for success, warning, and destructive states, complete dark mode implementation, and WCAG 2.1 AA compliance. Interactive Storybook documentation provides live examples for every component state and variant.</p>
<section class="wp-block-group l-wrap is-layout-flow wp-block-group-is-layout-flow">
<div class="wp-block-columns is-layout-flex wp-container-core-columns-is-layout-9d6595d7 wp-block-columns-is-layout-flex">
<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
<figure class="wp-block-image size-large o-browser"><img loading="lazy" decoding="async" width="1443" height="868" src="https://southleft.pages.dev/media/campusiq-alert-component-dark-mode.webp" alt="Alert component in dark mode showing semantic color variants" class="wp-image-3402"><figcaption class="wp-element-caption">Alert component in dark mode with success, warning, and destructive semantic color variants.</figcaption></figure>
</div>
<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
<figure class="wp-block-image size-large o-browser"><img loading="lazy" decoding="async" width="1443" height="869" src="https://southleft.pages.dev/media/campusiq-alert-documentation.webp" alt="Alert component documentation in Storybook with interactive examples" class="wp-image-3403"><figcaption class="wp-element-caption">Interactive Storybook documentation with live examples and usage guidelines for every component state.</figcaption></figure>
</div>
</div>
</section>
<section class="c-split-media-content l-wrap c-split-media-content--media-right  has-fade-up">
<div class="c-split-media-content__container l-container u-spacing--xl">
<div class="c-split-media-content__group">
<div class="c-split-media-content__media u-spacing--xl">
<div class="c-split-media-content__media-group">
<div class="c-split-media-content__image">
<figure class="o-figure">
<img decoding="async" class="o-image" src="https://southleft.pages.dev/media/campusiq-dialog-accessibility-testing.webp" alt="Dialog component accessibility testing showing keyboard navigation and ARIA attribute validation">
<figcaption class="o-figure__caption o-caption">Dialog component with accessibility testing — validating keyboard navigation, focus management, and ARIA attributes.</figcaption>
</figure>
</div>

</div>
</div>
<div class="c-split-media-content__content c-split-media-content__content--wide">
<div class="c-split-media-content__copy-block">
<div class="o-rich-text c-split-media-content__rich-text">
<h2 class="wp-block-heading"><strong>Accessibility as Foundation</strong></h2>
<p>Every component in the system meets WCAG 2.1 AA standards. Accessibility is not a checklist item — it is embedded in the component architecture through semantic markup, keyboard navigation patterns, and ARIA attributes.</p>
<p>The Dialog component demonstrates this approach: each interaction pattern is validated against accessibility guidelines before entering the production library. Focus management, screen reader announcements, and escape key handling are built into the component core behavior.</p>
</div>
</div>
</div>
</div>
</div>
</section>
<figure class="wp-block-image size-large o-browser"><img loading="lazy" decoding="async" width="1389" height="1205" src="https://southleft.pages.dev/media/campusiq-dropdown-menu-docs.webp" alt="DropdownMenu component documentation showing keyboard navigation patterns and accessibility specifications" class="wp-image-3405"><figcaption class="wp-element-caption">DropdownMenu documentation with keyboard navigation patterns and accessibility specifications for every interaction state.</figcaption></figure>
<h2 class="wp-block-heading" id="h-the-impact"><strong>The Impact</strong></h2>
<p>The design system established contextual continuity that did not exist before. The product director now validates layouts independently through Story UI. The development team generates consistent, on-brand implementations through AI tools that understand design intent. What previously required hours of back-and-forth now happens in minutes.</p>
<p>The token-first architecture means CampusIQ can adapt or migrate component libraries without rebuilding their design foundation. As they continue building SpaceWalker and Space Utilization, new components integrate immediately across all products through AI-aware workflows. The governance structure ensures design quality while development velocity increases.</p>
<h2 class="wp-block-heading" id="h-context-as-currency"><strong>Context as Currency</strong></h2>
<p>This engagement demonstrates what becomes possible when design systems carry meaning and intent, not just visual specifications. By embedding purpose, interaction behavior, and accessibility guidance directly into components, the system becomes infrastructure that scales with AI-driven workflows. CampusIQ now has a model for how lean teams achieve enterprise-quality consistency while maintaining rapid development velocity.</p>
