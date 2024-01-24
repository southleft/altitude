import React from 'react';
import { createComponent } from '@lit/react';
import { SLSlider as SLWebSlider } from 'sl-web-components/dist/components/slider/slider';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebSlider.el, SLWebSlider],
  suffix: PackageJson.version
});

export const SLSlider = createComponent({
  react: React,
  tagName: elementMap.get(SLWebSlider.el),
  elementClass: SLWebSlider,
  events: {}
});
