import { createComponent } from '@lit/react';
import { ALBadge as ALWebBadge } from 'al-web-components/dist/components/badge/badge';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebBadge.el, ALWebBadge],
  suffix: PackageJson.version
});

export const ALBadge = createComponent({
  react: React,
  tagName: elementMap.get(ALWebBadge.el),
  elementClass: ALWebBadge
});
