---
title: "Crafting a Secure, User-Centric Resource Hub for Kennedy Krieger Institute"
client: "Kennedy Krieger Institute"
date: 2023-09-05
oneLiner: "A HIPAA-compliant, DOD-funded resource hub serving military families, providers, and the public — with research-grade analytics."
summary: "Kennedy Krieger Institute needed a Department of Defense–funded resource hub serving military families, healthcare providers, and the general public under strict HIPAA compliance. Southleft navigated conflicting priorities — diverse user groups, security, and Salesforce integration — with intricate content modeling and individualized Google Analytics tracking that delivered the highly detailed research data KKI required while preserving confidentiality."
capabilities: ["Content Modeling","UX/UI Design","WordPress"]
industry: "Healthcare & Research"
hero: "https://southleft.pages.dev/media/about.webp"
showHero: false
featured: false
---

<h2 class="wp-block-heading">Introduction: The Genesis of a Complex Endeavor</h2>
<p><a href="https://www.kennedykrieger.org/" target="_blank" rel="noreferrer noopener">Kennedy Krieger Institute</a> (KKI), a leading institute in healthcare and research, presented us with a multifaceted challenge that was as unique as it was intricate. Funded by the Department of Defense (DOD), the project was a labyrinth of complexities. KKI required a resource hub capable of serving multiple user groups, including military families, healthcare providers, and the general public, all while adhering to stringent HIPAA compliance standards.&nbsp;&nbsp;</p>
<section class="c-split-media-content l-wrap c-split-media-content--media-left  has-fade-up">
<div class="c-split-media-content__container l-container u-spacing--xl">
<div class="c-split-media-content__group">
<div class="c-split-media-content__media u-spacing--xl">
<div class="c-split-media-content__media-group">
<div class="c-split-media-content__image">
<figure class="o-figure">
<img decoding="async" class="o-image" src="https://southleft.pages.dev/media/about.webp" alt="About page screenshot">
</figure>
</div>

</div>
</div>
<div class="c-split-media-content__content c-split-media-content__content--wide">
<div class="c-split-media-content__copy-block">
<div class="o-rich-text c-split-media-content__rich-text">
<h2 class="wp-block-heading">Navigating the Intricacies</h2>
<p>The project was rife with challenges, coming from the triple, often conflicting priorities of 1) catering to diverse user groups, 2) maintaining HIPAA compliance, and 3) integrating with complex software systems like Salesforce.</p>
<p>The hub had to be a fortress of security while offering the flexibility to serve various user needs. One of the most daunting aspects was the intricate content modeling required to provide this flexibility. As developer Ryan Smith aptly put it, this was a “monster of a task.”</p>
<p>Moreover, KKI had specific requirements for tracking user interactions for research purposes. “Their primary challenge was the need for highly detailed data for research,” elaborated Ryan Smith. The complexity was further compounded by the need for individualized Google Analytics tracking, all while ensuring absolute confidentiality to remain HIPAA compliant.</p>
</div>
</div>
</div>
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
<img decoding="async" class="o-image" src="https://southleft.pages.dev/media/tutorials-e1694746867821.webp" alt="Image">
</figure>
</div>

</div>
</div>
<div class="c-split-media-content__content c-split-media-content__content--wide">
<div class="c-split-media-content__copy-block">
<div class="o-rich-text c-split-media-content__rich-text">
<h2 class="wp-block-heading">Crafting a Tailored Solution</h2>
<p>This wasn’t going to be just a website; it would be a multi-faceted platform requiring a blend of design, development, and data analytics.</p>
<p>Our team worked closely with KKI’s in-house experts and external consultants. We also enlisted a trusted content strategist we’d worked with before to assist KKI with content creation and strategy. Additionally, our design and development teams collaborated extensively to ensure cohesive and reliable results.</p>
<p>We utilized a headless WordPress setup with Advanced Custom Fields for content management and employed GraphQL to bridge the data between WordPress and the front-end.</p>
<p>Our decision to adopt a mono-repo structure allowed us to maintain a singular code base while keeping the applications separate, thereby providing flexibility for future iterations. This, combined with a WordPress multisite setup, ensured that KKI staff could manage all sites from a single hub, streamlining their content editing process.</p>
<p>Putting to use our expertise in Design Systems, we constructed a Storybook component library as a centralized repository for all components. This was pivotal in the project’s architecture and streamlined the development process. Moreover, it will continue to significantly influence the site’s future maintenance and growth in terms of efficiency and success.</p>
</div>
</div>
</div>
</div>
</div>
</section>
<section class="c-split-media-content l-wrap c-split-media-content--media-left c-split-media-content--sticky has-fade-up">
<div class="c-split-media-content__container l-container u-spacing--xl">
<div class="c-split-media-content__group">
<div class="c-split-media-content__media u-spacing--xl">
<div class="c-split-media-content__media-group">
<div class="c-split-media-content__image">
<figure class="o-figure">
<img decoding="async" class="o-image" src="https://southleft.pages.dev/media/tutorial-e1694746832872.webp" alt="Tutorial page screenshot">
</figure>
</div>

</div>
</div>
<div class="c-split-media-content__content c-split-media-content__content--wide">
<div class="c-split-media-content__copy-block">
<div class="o-rich-text c-split-media-content__rich-text">
<h2 class="wp-block-heading">Analytics and Tracking: A Symphony of Complexity and Compliance</h2>
<p>Our team went above and beyond to construct an intricate, multifaceted analytics system that not only met KKI’s robust research needs but also adhered to stringent security and confidentiality requirements to maintain HIPAA compliance. Justin Young took the initiative to immerse himself in Google Analytics and Google Tag Manager, a self-driven effort that was pivotal in setting up the complex tracking system KKI required.</p>
</div>
</div>
</div>
</div>
</div>
</section>
<p>Justin elaborated on the depth of the tracking, stating, “Basically, we’re measuring every interaction on the site.” He set up custom events and definitions in Google Tag Manager to capture every user interaction. One of the most intricate aspects was video playback tracking in JW Player. Justin leveraged JW Player events to monitor all facets of video interactions, such as play, pause, and the percentage of video watched. “JW Player’s API was crucial because it provides access to every event within a video. When an event occurs, we send that data through Tag Manager to Google Analytics,” he explained.</p>
<p>The complexity didn’t end there. For KKI’s research, it was imperative that Google Analytics tracking be linked to each individual user without revealing their identity at any point in the complex system we’d established—spanning WordPress, Vercel, Google Analytics, and GraphQL. This was to ensure HIPAA compliance and safeguard confidential information. Justin integrated Google Analytics with Auth0 for individualized tracking and set up multiple data streams into one analytics account to aggregate data from different sites. Furthermore, each user’s data was linked to their own unique, secret code. This allowed all interactions to be associated with that individual, without revealing their identity in any part of the software system. However, approved researchers and doctors could identify the individual using that secret code, ensuring both confidentiality and research integrity.</p>
<h2 class="wp-block-heading">A Triumph of Complexity</h2>
<p>The project was a resounding success, meeting intricate requirements and delivering a platform that is both user-centric and feature-rich. The analytics setup provides invaluable data for research, culminating in a multi-faceted, HIPAA-compliant resource hub that serves its primary users and equips KKI with crucial research data.&nbsp;&nbsp;</p>
<h2 class="wp-block-heading">The Journey and Beyond</h2>
<p>The project’s complexity made it a rewarding experience, pushing our technological boundaries and providing an opportunity to work on something with a meaningful impact. “This is perhaps my favorite project to date,” said Ryan Smith. Justin Young’s self-directed learning was crucial in establishing the intricate tracking system, and we’re deeply appreciative of our entire team’s dedication and adaptability.&nbsp;&nbsp;</p>
<p>In summary, this project stands as one of the most complex yet fulfilling endeavors we’ve undertaken, and we take immense pride in the solution we’ve crafted.</p>
