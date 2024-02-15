import { createComponent } from '@lit/react';
import { SLIconBookmark as SLWebIconBookmark } from 'sl-web-components/dist/components/icon/icons/bookmark';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconBookmark.el, SLWebIconBookmark],
  suffix: PackageJson.version
});

export const SLIconBookmark = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconBookmark.el),
  elementClass: SLWebIconBookmark,
  events: {}
});
