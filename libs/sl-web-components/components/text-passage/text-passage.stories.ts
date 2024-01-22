import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../link/link';
import './text-passage';

export default {
  title: 'Components/Text Passage',
  component: 'sl-text-passage',
  tags: [  'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    maxWidth: {
      control: 'radio',
      options: ['default', 'sm'],
    },
  },
};

const Template = (args) => html`
  <sl-text-passage ${spread(args)}>
    <h1>Heading 1</h1>
    <p>
      A text passage contains arbitrary text that might come from a CMS. It should live within a container that caps the line length of the text to
      avoid a straining reading experience.
    </p>
    <h2>Heading 2</h2>
    <p>
      This is another paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
      magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
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
      <sl-link href="#">Lorem ipsum dolor sit amet</sl-link>, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
      ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
    <blockquote>
      <p>This is a quotation from something.</p>
      <cite>Cite source</cite>
    </blockquote>
    <h4>Heading 4</h4>
    <p>
      This is another paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
      magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
    <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    <h5>Heading 5</h5>
    <p>
      This is another paragraph of text. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
      magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    </p>
    <p>That is all.</p>
    <a href="#">Download now</a>
  </sl-text-passage>
`;

export const Default = Template.bind({});
Default.args = {};

export const MaxWidthSm = Template.bind({});
MaxWidthSm.args = {
  maxWidth: 'sm',
};
