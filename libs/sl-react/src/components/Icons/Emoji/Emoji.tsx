import { createComponent } from '@lit-labs/react';
import { SLIconEmoji as SLWebIconEmoji } from 'sl-web-components/dist/components/icon/icons/emoji';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconEmoji.el, SLWebIconEmoji],
  suffix: PackageJson.version
});

export const SLIconEmoji = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconEmoji.el),
  elementClass: SLWebIconEmoji,
  events: {}
});
