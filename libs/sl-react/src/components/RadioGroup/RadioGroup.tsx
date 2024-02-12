import { createComponent } from '@lit/react';
import { SLRadioGroup as SLWebRadioGroup } from 'sl-web-components/dist/components/radio-group/radio-group';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebRadioGroup.el, SLWebRadioGroup],
  suffix: PackageJson.version
});

export const SLRadioGroup = createComponent({
  react: React,
  tagName: elementMap.get(SLWebRadioGroup.el),
  elementClass: SLWebRadioGroup,
  events: {}
});
