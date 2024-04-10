import { createComponent } from '@lit/react';
import { ALChipGroup as ALWebChipGroup } from '@southleft/al-web-components/dist/components/chip-group/chip-group';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebChipGroup.el, ALWebChipGroup],
  suffix: PackageJson.version
});

export const ALChipGroup = createComponent({
  react: React,
  tagName: elementMap.get(ALWebChipGroup.el),
  elementClass: ALWebChipGroup,
  events: {}
});
