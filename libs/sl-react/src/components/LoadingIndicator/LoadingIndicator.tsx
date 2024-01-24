import { createComponent } from '@lit/react';
import { SLLoadingIndicator as SLWebLoadingIndicator } from 'sl-web-components/dist/components/loading-indicator/loading-indicator';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebLoadingIndicator.el, SLWebLoadingIndicator],
  suffix: PackageJson.version
});

export const SLLoadingIndicator = createComponent({
  react: React,
  tagName: elementMap.get(SLWebLoadingIndicator.el),
  elementClass: SLWebLoadingIndicator,
  events: {}
});
