import { createComponent } from '@lit/react';
import { ALLayoutSection as ALWebLayoutSection } from 'al-web-components/dist/components/layout-section/layout-section';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebLayoutSection.el, ALWebLayoutSection],
  suffix: PackageJson.version
});

export const ALLayoutSection = createComponent({
  react: React,
  tagName: elementMap.get(ALWebLayoutSection.el),
  elementClass: ALWebLayoutSection,
  events: {}
});