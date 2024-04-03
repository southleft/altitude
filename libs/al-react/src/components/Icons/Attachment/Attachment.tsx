import { createComponent } from '@lit/react';
import { ALIconAttachment as ALWebIconAttachment } from '@southleft/al-web-components/dist/components/icon/icons/attachment';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconAttachment.el, ALWebIconAttachment],
  suffix: PackageJson.version
});

export const ALIconAttachment = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconAttachment.el),
  elementClass: ALWebIconAttachment,
  events: {}
});
