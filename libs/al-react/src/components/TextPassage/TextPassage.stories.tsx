import { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALTextPassage, ALLink } from '../..';

export default {
  title: 'Atoms/Text Passage',
  component: ALTextPassage,
  parameters: { status: { type: 'beta' } },
  argTypes: {
    maxWidth: {
      control: 'radio',
      options: ['default', 'sm'],
    },
  },
  args: {
    children: (
      <>
        <h1>Heading 1</h1>
        <p>
          A text passage contains arbitrary text that might come from a CMS. It should live within a container that caps the line length of the text
          to avoid a straining reading experience.
        </p>
        <h2>Heading 2</h2>
        <p>
          This is another paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
          dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
        <ul>
          <li>Here is a unordered list item</li>
          <li>Here is a unordered list item</li>
          <li>Here is a unordered list item</li>
          <li>Here is a unordered list item</li>
        </ul>
        <h3>Heading 3</h3>
        <ol>
          <li>Here is a unordered list item</li>
          <li>Here is a unordered list item</li>
          <li>Here is a unordered list item</li>
          <li>Here is a unordered list item</li>
        </ol>
        <p>
          <ALLink href="#">Lorem ipsum dolor sit amet</ALLink>, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
        <blockquote>
          <p>This is a quotation from something.</p>
          <cite>Cite source</cite>
        </blockquote>
        <h4>Heading 4</h4>
        <p>
          This is another paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
          dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        <h5>Heading 5</h5>
        <p>
          This is another paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
          dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
        <p>That is all.</p>
        <a href="#">Download now</a>
      </>
    )
  }
};

export const Default: StoryObj<typeof ALTextPassage> = { args: {} };

export const MaxWidthSm: StoryObj<typeof ALTextPassage> = {
  args: {
    maxWidth: 'sm'
  }
};