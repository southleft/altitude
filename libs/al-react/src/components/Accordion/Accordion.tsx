'use client';

import { createComponent } from '@lit/react';
import { ALAccordion as ALWebAccordion } from '@southleft/al-web-components/components/accordion';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebAccordion.el, ALWebAccordion],
  suffix: PackageJson.version
});

export const ALAccordion = createComponent({
  react: React,
  tagName: elementMap.get(ALWebAccordion.el),
  elementClass: ALWebAccordion,
  events: {}
});