import { createComponent } from '@lit/react';
import { SLBadge as SLWebBadge } from 'sl-web-components/dist/components/badge/badge';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebBadge.el, SLWebBadge],
  suffix: PackageJson.version
});

export const SLBadge = createComponent({
  react: React,
  tagName: elementMap.get(SLWebBadge.el),
  elementClass: SLWebBadge
});
