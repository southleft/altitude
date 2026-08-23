'use client';

import { createComponent } from '@lit/react';
import { ALTestimonial as ALWebTestimonial } from '@southleft/al-web-components/components/testimonial';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTestimonial.el, ALWebTestimonial],
  suffix: PackageJson.version
});

export const ALTestimonial = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTestimonial.el),
  elementClass: ALWebTestimonial
});
