import { createComponent } from '@lit/react';
import { ALChip as ALWebChip } from '@southleft/al-web-components/dist/components/chip/chip';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebChip.el, ALWebChip],
  suffix: PackageJson.version
});

export const ALChip = createComponent({
  react: React,
  tagName: elementMap.get(ALWebChip.el),
  elementClass: ALWebChip,
  events: {}
});
