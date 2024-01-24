import { createComponent } from '@lit/react';
import { SLLayoutSection as SLWebLayoutSection } from 'sl-web-components/dist/components/layout-section/layout-section';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebLayoutSection.el, SLWebLayoutSection],
  suffix: PackageJson.version
});

export const SLLayoutSection = createComponent({
  react: React,
  tagName: elementMap.get(SLWebLayoutSection.el),
  elementClass: SLWebLayoutSection,
  events: {}
});
