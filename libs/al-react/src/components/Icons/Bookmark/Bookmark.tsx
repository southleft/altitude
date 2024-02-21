import { createComponent } from '@lit/react';
import { ALIconBookmark as ALWebIconBookmark } from 'al-web-components/dist/components/icon/icons/bookmark';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconBookmark.el, ALWebIconBookmark],
  suffix: PackageJson.version
});

export const ALIconBookmark = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconBookmark.el),
  elementClass: ALWebIconBookmark,
  events: {}
});
