import { createComponent } from '@lit/react';
import { SLInput as SLWebInput } from 'sl-web-components/dist/components/input/input';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebInput.el, SLWebInput],
  suffix: PackageJson.version
});

export const SLInput = createComponent({
  react: React,
  tagName: elementMap.get(SLWebInput.el),
  elementClass: SLWebInput,
  events: {}
});
