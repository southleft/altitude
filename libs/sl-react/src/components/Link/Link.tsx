import { createComponent } from '@lit/react';
import { SLLink as SLWebLink } from 'sl-web-components/dist/components/link/link';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebLink.el, SLWebLink],
  suffix: PackageJson.version
});

export const SLLink = createComponent({
  react: React,
  tagName: elementMap.get(SLWebLink.el),
  elementClass: SLWebLink,
  events: {}
});
