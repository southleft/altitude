import { createComponent } from '@lit/react';
import { SLLayout as SLWebLayout } from 'sl-web-components/dist/components/layout/layout';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebLayout.el, SLWebLayout],
  suffix: PackageJson.version
});

export const SLLayout = createComponent({
  react: React,
  tagName: elementMap.get(SLWebLayout.el),
  elementClass: SLWebLayout,
  events: {}
});
