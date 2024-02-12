import { createComponent } from '@lit/react';
import { SLCheckboxGroup as SLWebCheckboxGroup } from 'sl-web-components/dist/components/checkbox-group/checkbox-group';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebCheckboxGroup.el, SLWebCheckboxGroup],
  suffix: PackageJson.version
});

export const SLCheckboxGroup = createComponent({
  react: React,
  tagName: elementMap.get(SLWebCheckboxGroup.el),
  elementClass: SLWebCheckboxGroup,
  events: {
    onChange: 'change',
  },
});
