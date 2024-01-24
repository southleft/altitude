import React from 'react';
import { createComponent } from '@lit/react';
import { SLFileUpload as SLWebFileUpload } from 'sl-web-components/dist/components/file-upload/file-upload';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebFileUpload.el, SLWebFileUpload],
  suffix: PackageJson.version
});

export const SLFileUpload = createComponent({
  react: React,
  tagName: elementMap.get(SLWebFileUpload.el),
  elementClass: SLWebFileUpload,
  events: {}
});
