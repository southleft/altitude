import { createComponent } from '@lit/react';
import { SLIconLayoutMasonry as SLWebIconLayoutMasonry } from 'sl-web-components/dist/components/icon/icons/layout-masonry';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconLayoutMasonry.el, SLWebIconLayoutMasonry],
  suffix: PackageJson.version
});

export const SLIconLayoutMasonry = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconLayoutMasonry.el),
  elementClass: SLWebIconLayoutMasonry,
  events: {}
});
