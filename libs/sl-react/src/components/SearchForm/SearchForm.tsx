import { createComponent } from '@lit/react';
import { SLSearchForm as SLWebSearchForm } from 'sl-web-components/dist/components/search-form/search-form';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebSearchForm.el, SLWebSearchForm],
  suffix: PackageJson.version
});

export const SLSearchForm = createComponent({
  react: React,
  tagName: elementMap.get(SLWebSearchForm.el),
  elementClass: SLWebSearchForm,
  events: {}
});
