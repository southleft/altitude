import { createComponent } from '@lit/react';
import { SLChipGroup as SLWebChipGroup } from 'sl-web-components/dist/components/chip-group/chip-group';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebChipGroup.el, SLWebChipGroup],
  suffix: PackageJson.version
});

export const SLChipGroup = createComponent({
  react: React,
  tagName: elementMap.get(SLWebChipGroup.el),
  elementClass: SLWebChipGroup,
  events: {}
});
