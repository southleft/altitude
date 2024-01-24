import { createComponent } from '@lit/react';
import { SLHeading as SLWebHeading } from 'sl-web-components/dist/components/heading/heading';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebHeading.el, SLWebHeading],
  suffix: PackageJson.version
});

export const SLHeading = createComponent({
  react: React,
  tagName: elementMap.get(SLWebHeading.el),
  elementClass: SLWebHeading,
  events: {}
});
