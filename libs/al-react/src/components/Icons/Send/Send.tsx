import { createComponent } from '@lit/react';
import { ALIconSend as ALWebIconSend } from '@southleft/al-web-components/dist/components/icon/icons/send';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconSend.el, ALWebIconSend],
  suffix: PackageJson.version
});

export const ALIconSend = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSend.el),
  elementClass: ALWebIconSend,
  events: {}
});
