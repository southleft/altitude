import { createComponent } from '@lit/react';
import { ALLayout as ALWebLayout } from 'al-web-components/dist/components/layout/layout';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebLayout.el, ALWebLayout],
  suffix: PackageJson.version
});

export const ALLayout = createComponent({
  react: React,
  tagName: elementMap.get(ALWebLayout.el),
  elementClass: ALWebLayout,
  events: {}
});
