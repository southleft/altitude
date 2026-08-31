import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../link/link';
import './text-block';
import { loremParagraph, loremSentences, loremWords } from '../../fixtures';

export default {
  title: 'Atoms/Text/Text Block',
  component: 'al-text-block',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    maxWidth: {
      control: 'radio',
      options: ['default', 'sm'],
    },
  },
};

const Template = (args) => html`
  <al-text-block ${spread(args)}>
    <h1>Heading 1</h1>
    <p>
      A text passage contains arbitrary text that might come from a CMS. It should live within a container that caps the line length of the text to
      avoid a straining reading experience.
    </p>
    <h2>Heading 2</h2>
    <p>
      ${loremParagraph('text-block-1')}
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
      <al-link href="#">${loremWords(5, 'text-block-link')}</al-link>, ${loremSentences(2, 'text-block-2', false)}
    </p>
    <blockquote>
      <p>This is a quotation from something.</p>
      <cite>Cite source</cite>
    </blockquote>
    <h4>Heading 4</h4>
    <p>
      ${loremParagraph('text-block-3')}
    </p>
    <p>${loremSentences(1, 'text-block-4', false)}</p>
    <h5>Heading 5</h5>
    <p>
      ${loremParagraph('text-block-5')}
    </p>
    <p>That is all.</p>
    <a href="#">Download now</a>
  </al-text-block>
`;

export const Default = Template.bind({});
Default.args = {};

export const MaxWidthSm = Template.bind({});
MaxWidthSm.args = {
  maxWidth: 'sm',
};
