import { createComponent } from '@lit/react';
import { ALIconEmoji as ALWebIconEmoji } from '@southleft/al-web-components/dist/components/icon/icons/emoji';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconEmoji.el, ALWebIconEmoji],
  suffix: PackageJson.version
});

export const ALIconEmoji = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconEmoji.el),
  elementClass: ALWebIconEmoji,
  events: {}
});
