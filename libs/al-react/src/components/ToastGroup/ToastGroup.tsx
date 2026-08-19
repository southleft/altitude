import { createComponent } from '@lit/react';
import { ALToastGroup as ALWebToastGroup } from 'al-web-components/components/toast-group';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebToastGroup.el, ALWebToastGroup],
  suffix: PackageJson.version
});

export const ALToastGroup = createComponent({
  react: React,
  tagName: elementMap.get(ALWebToastGroup.el),
  elementClass: ALWebToastGroup,
  events: {
    onToastGroupClose: 'onToastGroupClose',
    onToastGroupOpen: 'onToastGroupOpen'
  }
});
