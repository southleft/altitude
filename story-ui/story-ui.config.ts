import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ComponentConfig {
  name: string;
  description?: string;
  props?: string[];
  slots?: string[];
  category?: 'layout' | 'content' | 'form' | 'navigation' | 'feedback' | 'other';
  examples?: string[];
}

export interface LayoutRules {
  multiColumnWrapper?: string;
  columnComponent?: string;
  containerComponent?: string;
  layoutExamples?: {
    twoColumn?: string;
    threeColumn?: string;
    grid?: string;
  };
  prohibitedElements?: string[];
}

export interface StoryUIConfig {
  // File paths
  generatedStoriesPath: string;
  componentsPath?: string;
  componentsMetadataPath?: string;

  // Story configuration
  storyPrefix: string;
  defaultAuthor: string;
  importPath: string;

  // Component system configuration
  componentPrefix: string;
  components: ComponentConfig[];
  layoutRules: LayoutRules;

  // Template configuration
  sampleStory?: string;
  storyTemplate?: string;

  // AI prompt configuration
  systemPrompt?: string;
  layoutInstructions?: string[];
  examples?: string[];
}

// Default generic configuration
export const DEFAULT_CONFIG: StoryUIConfig = {
  generatedStoriesPath: path.resolve(process.cwd(), './src/stories/generated/'),
  componentsPath: path.resolve(process.cwd(), './src/components'),
  componentsMetadataPath: undefined,
  storyPrefix: 'Generated/',
  defaultAuthor: 'Story UI AI',
  importPath: 'your-component-library',
  componentPrefix: '',
  components: [], // Will be populated dynamically
  layoutRules: {
    multiColumnWrapper: 'div',
    columnComponent: 'div',
    containerComponent: 'div',
    layoutExamples: {
      twoColumn: `<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
  <div>
    <Card>
      <h3>Left Card</h3>
      <p>Left content</p>
    </Card>
  </div>
  <div>
    <Card>
      <h3>Right Card</h3>
      <p>Right content</p>
    </Card>
  </div>
</div>`,
      threeColumn: `<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
  <div>
    <Card>
      <h3>Column 1</h3>
      <p>First column content</p>
    </Card>
  </div>
  <div>
    <Card>
      <h3>Column 2</h3>
      <p>Second column content</p>
    </Card>
  </div>
  <div>
    <Card>
      <h3>Column 3</h3>
      <p>Third column content</p>
    </Card>
  </div>
</div>`
    },
    prohibitedElements: []
  },
  sampleStory: `import type { StoryObj } from '@storybook/react-webpack5';
import { Card } from 'your-component-library';

export default {
  title: 'Layouts/Sample Layout',
  component: Card,
};

export const Default: StoryObj<typeof Card> = {
  args: {
    children: (
      <Card>
        <h3>Sample Card</h3>
        <p>Sample content</p>
      </Card>
    )
  }
};`
};

// Generic configuration template for other design systems
export const GENERIC_CONFIG_TEMPLATE: Partial<StoryUIConfig> = {
  storyPrefix: 'Generated/',
  defaultAuthor: 'Story UI AI',
  componentPrefix: '',
  layoutRules: {
    multiColumnWrapper: 'div',
    columnComponent: 'div',
    layoutExamples: {
      twoColumn: `<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
  <div>Column 1 content</div>
  <div>Column 2 content</div>
</div>`,
      threeColumn: `<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
  <div>Column 1 content</div>
  <div>Column 2 content</div>
  <div>Column 3 content</div>
</div>`
    },
    prohibitedElements: []
  }
};

// Load configuration (can be overridden by user)
export const STORY_UI_CONFIG: StoryUIConfig = {
  generatedStoriesPath: path.resolve(__dirname, '../../libs/al-react/src/components/generated/'),
  componentsPath: path.resolve(__dirname, '../../libs/al-react/src/components'),
  componentsMetadataPath: path.resolve(__dirname, '../../libs/al-web-components/custom-elements.json'),
  storyPrefix: 'Story UI Pages/',
  defaultAuthor: 'Story UI AI',
  importPath: 'al-react/src',
  componentPrefix: 'AL',
  components: [], // Will be populated dynamically
  layoutRules: {
    multiColumnWrapper: 'ALLayout',
    columnComponent: 'ALLayoutSection',
    containerComponent: 'ALLayoutContainer',
    layoutExamples: {
      twoColumn: `<ALLayout>
  <ALLayoutSection>
    <ALCard>
      <ALHeading slot="header" variant="md">Left Card</ALHeading>
      <ALTextPassage>Left content</ALTextPassage>
    </ALCard>
  </ALLayoutSection>
  <ALLayoutSection>
    <ALCard>
      <ALHeading slot="header" variant="md">Right Card</ALHeading>
      <ALTextPassage>Right content</ALTextPassage>
    </ALCard>
  </ALLayoutSection>
</ALLayout>`,
      threeColumn: `<ALLayout>
  <ALLayoutSection>
    <ALCard>
      <ALHeading slot="header" variant="md">Column 1</ALHeading>
      <ALTextPassage>First column content</ALTextPassage>
    </ALCard>
  </ALLayoutSection>
  <ALLayoutSection>
    <ALCard>
      <ALHeading slot="header" variant="md">Column 2</ALHeading>
      <ALTextPassage>Second column content</ALTextPassage>
    </ALCard>
  </ALLayoutSection>
  <ALLayoutSection>
    <ALCard>
      <ALHeading slot="header" variant="md">Column 3</ALHeading>
      <ALTextPassage>Third column content</ALTextPassage>
    </ALCard>
  </ALLayoutSection>
</ALLayout>`
    },
    prohibitedElements: ['div', 'span', 'section']
  },
  sampleStory: `import type { Meta, StoryObj } from '@storybook/react';
import { ALLayout, ALLayoutSection, ALCard, ALHeading, ALTextPassage } from 'al-react/src';

export default {
  title: 'Story UI Pages/Sample Layout',
  component: ALLayout,
  subcomponents: { ALLayoutSection, ALCard },
} as Meta<typeof ALLayout>;

export const Default: StoryObj<typeof ALLayout> = {
  args: {
    children: (
      <ALLayout>
        <ALLayoutSection>
          <ALCard>
            <ALHeading slot="header" variant="md">Sample Card</ALHeading>
            <ALTextPassage>Sample content</ALTextPassage>
          </ALCard>
        </ALLayoutSection>
      </ALLayout>
    )
  }
};`
};

// Function to merge user config with defaults
export function createStoryUIConfig(userConfig: Partial<StoryUIConfig>): StoryUIConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    layoutRules: {
      ...DEFAULT_CONFIG.layoutRules,
      ...userConfig.layoutRules,
      layoutExamples: {
        ...DEFAULT_CONFIG.layoutRules.layoutExamples,
        ...userConfig.layoutRules?.layoutExamples
      }
    }
  };
}
