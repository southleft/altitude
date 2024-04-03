import { createComponent } from '@lit/react';
import { ALCheckboxGroup as ALWebCheckboxGroup } from '@southleft/al-web-components/dist/components/checkbox-group/checkbox-group';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebCheckboxGroup.el, ALWebCheckboxGroup],
  suffix: PackageJson.version
});

export const ALCheckboxGroup = createComponent({
  react: React,
  tagName: elementMap.get(ALWebCheckboxGroup.el),
  elementClass: ALWebCheckboxGroup,
  events: {
    onChange: 'change',
  },
});
