#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupProductionGitignore } from '../story-generator/productionGitignoreManager.js';
import { createStoryUIConfig } from '../story-ui.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('story-ui')
  .description('AI-powered Storybook story generator for React component libraries')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Story UI configuration')
  .option('--auto-detect', 'Auto-detect project structure')
  .option('--template <template>', 'Use a predefined template (material-ui, chakra-ui, ant-design)')
  .action(async (options) => {
    console.log('🚀 Initializing Story UI...');

    if (options.autoDetect) {
      console.log('🔍 Auto-detecting project structure...');
      await autoDetectAndCreateConfig();
    } else if (options.template) {
      console.log(`📋 Using ${options.template} template...`);
      await createTemplateConfig(options.template);
    } else {
      console.log('📝 Creating basic configuration...');
      await createBasicConfig();
    }

    console.log('✅ Story UI configuration created!');

    // Set up gitignore automatically
    try {
      const configModule = await import(path.resolve(process.cwd(), 'story-ui.config.js'));
      const userConfig = configModule.default;
      const fullConfig = createStoryUIConfig(userConfig);
      setupProductionGitignore(fullConfig);
    } catch (error) {
      console.warn('⚠️  Could not set up .gitignore automatically. Please add the generated directory manually.');
    }

    console.log('📖 Edit story-ui.config.js to customize for your component library');
    console.log('🚀 Run "npx story-ui start" to begin generating stories');
  });

program
  .command('start')
  .description('Start the Story UI server')
  .option('-p, --port <port>', 'Port to run the server on', '4001')
  .option('-c, --config <config>', 'Path to configuration file')
  .action((options) => {
    console.log('🚀 Starting Story UI server...');

    const serverPath = path.resolve(__dirname, '../dist/mcp-server/index.js');
    const env = { ...process.env };

    if (options.port) {
      env.PORT = options.port;
    }

    if (options.config) {
      env.STORY_UI_CONFIG_PATH = options.config;
    }

    const server = spawn('node', [serverPath], {
      stdio: 'inherit',
      env
    });

    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
    });

    process.on('SIGINT', () => {
      server.kill('SIGINT');
    });
  });

program
  .command('config')
  .description('Configuration utilities')
  .option('--generate', 'Generate a sample configuration file')
  .option('--type <type>', 'Configuration file type (json|js)', 'js')
  .action((options) => {
    if (options.generate) {
      const filename = `story-ui.config.${options.type}`;
      generateSampleConfig(filename, options.type);
      console.log(`✅ Sample configuration generated: ${filename}`);
    }
  });

program
  .command('setup-gitignore')
  .description('Set up .gitignore for Story UI generated stories')
  .option('-c, --config <path>', 'Path to Story UI config file', 'story-ui.config.js')
  .action(async (options) => {
    console.log('🔧 Setting up .gitignore for Story UI...');

    try {
      const configPath = path.resolve(process.cwd(), options.config);
      const configModule = await import(configPath);
      const userConfig = configModule.default;
      const fullConfig = createStoryUIConfig(userConfig);

      const manager = setupProductionGitignore(fullConfig);

      if (manager.isProductionMode()) {
        console.log('🌐 Production environment detected');
        console.log('✅ Gitignore validation completed');
      } else {
        console.log('🔧 Development environment - gitignore updated');
      }

      console.log('✅ Gitignore setup completed successfully!');
    } catch (error) {
      console.error('❌ Failed to set up gitignore:', error);
      console.log('💡 Make sure you have a valid story-ui.config.js file');
      process.exit(1);
    }
  });

async function autoDetectAndCreateConfig() {
  const cwd = process.cwd();
  const config: any = {
    generatedStoriesPath: './src/stories/generated',
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
</div>`
      },
      prohibitedElements: []
    }
  };

  // Try to detect package.json
  const packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    config.importPath = packageJson.name || 'your-component-library';
  }

  // Try to detect components directory
  const possibleComponentPaths = [
    './src/components',
    './lib/components',
    './components',
    './src'
  ];

  for (const possiblePath of possibleComponentPaths) {
    if (fs.existsSync(path.join(cwd, possiblePath))) {
      config.componentsPath = possiblePath;
      break;
    }
  }

  writeConfig(config, 'js');
}

async function createTemplateConfig(template: string) {
  let config: any;

  switch (template) {
    case 'material-ui':
      config = {
        importPath: '@mui/material',
        componentPrefix: '',
        layoutRules: {
          multiColumnWrapper: 'Grid',
          columnComponent: 'Grid',
          layoutExamples: {
            twoColumn: `<Grid container spacing={2}>
  <Grid item xs={6}>
    <Card>Left content</Card>
  </Grid>
  <Grid item xs={6}>
    <Card>Right content</Card>
  </Grid>
</Grid>`
          }
        }
      };
      break;

    case 'chakra-ui':
      config = {
        importPath: '@chakra-ui/react',
        componentPrefix: '',
        layoutRules: {
          multiColumnWrapper: 'SimpleGrid',
          columnComponent: 'Box',
          layoutExamples: {
            twoColumn: `<SimpleGrid columns={2} spacing={4}>
  <Box><Card>Left content</Card></Box>
  <Box><Card>Right content</Card></Box>
</SimpleGrid>`
          }
        }
      };
      break;

    case 'ant-design':
      config = {
        importPath: 'antd',
        componentPrefix: '',
        layoutRules: {
          multiColumnWrapper: 'Row',
          columnComponent: 'Col',
          layoutExamples: {
            twoColumn: `<Row gutter={16}>
  <Col span={12}><Card>Left content</Card></Col>
  <Col span={12}><Card>Right content</Card></Col>
</Row>`
          }
        }
      };
      break;

    default:
      throw new Error(`Unknown template: ${template}`);
  }

  // Add common defaults
  config = {
    generatedStoriesPath: './src/stories/generated',
    componentsPath: './src/components',
    storyPrefix: 'Generated/',
    defaultAuthor: 'Story UI AI',
    ...config
  };

  writeConfig(config, 'js');
}

async function createBasicConfig() {
  const config = {
    generatedStoriesPath: './src/stories/generated',
    componentsPath: './src/components',
    storyPrefix: 'Generated/',
    defaultAuthor: 'Story UI AI',
    importPath: 'your-component-library',
    componentPrefix: '',
    layoutRules: {
      multiColumnWrapper: 'div',
      columnComponent: 'div',
      layoutExamples: {
        twoColumn: `<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
  <div>Column 1 content</div>
  <div>Column 2 content</div>
</div>`
      },
      prohibitedElements: []
    }
  };

  writeConfig(config, 'js');
}

function generateSampleConfig(filename: string, type: 'json' | 'js') {
  const config = {
    generatedStoriesPath: './src/stories/generated',
    componentsPath: './src/components',
    storyPrefix: 'Generated/',
    defaultAuthor: 'Story UI AI',
    importPath: 'your-component-library',
    componentPrefix: 'UI',
    layoutRules: {
      multiColumnWrapper: 'UIGrid',
      columnComponent: 'UIColumn',
      layoutExamples: {
        twoColumn: `<UIGrid columns={2}>
  <UIColumn><UICard>Left content</UICard></UIColumn>
  <UIColumn><UICard>Right content</UICard></UIColumn>
</UIGrid>`
      },
      prohibitedElements: []
    }
  };

  writeConfig(config, type, filename);
}

function writeConfig(config: any, type: 'json' | 'js', filename?: string) {
  const outputFile = filename || `story-ui.config.${type}`;

  if (type === 'json') {
    fs.writeFileSync(outputFile, JSON.stringify(config, null, 2));
  } else {
    const jsContent = `export default ${JSON.stringify(config, null, 2)};`;
    fs.writeFileSync(outputFile, jsContent);
  }
}

program.parse(process.argv);
