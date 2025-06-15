import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { autoDetectDesignSystem } from '../story-generator/configLoader.js';

interface SetupAnswers {
  designSystem: 'auto' | 'mui' | 'chakra' | 'antd' | 'mantine' | 'custom';
  importPath?: string;
  componentPrefix?: string;
  generatedStoriesPath?: string;
  componentsPath?: string;
}

export async function setupCommand() {
  console.log(chalk.blue.bold('\n🎨 Story UI Setup\n'));
  console.log('This will help you configure Story UI for your design system.\n');

  // Check if we're in a valid project
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error(chalk.red('❌ No package.json found. Please run this command in your project root.'));
    process.exit(1);
  }

  // Check if Storybook is installed
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const hasStorybook = packageJson.devDependencies?.['@storybook/react'] ||
                      packageJson.dependencies?.['@storybook/react'] ||
                      fs.existsSync(path.join(process.cwd(), '.storybook'));

  if (!hasStorybook) {
    console.warn(chalk.yellow('⚠️  Storybook not detected. Story UI works best with Storybook installed.'));
    console.log('Install Storybook first: npx storybook@latest init\n');
  }

  // Auto-detect design system
  const autoDetected = autoDetectDesignSystem();
  if (autoDetected) {
    console.log(chalk.green(`✅ Auto-detected design system:`));
    console.log(`   📦 Import path: ${autoDetected.importPath}`);
    if (autoDetected.componentPrefix) {
      console.log(`   🏷️  Component prefix: ${autoDetected.componentPrefix}`);
    }
    if (autoDetected.componentsPath) {
      console.log(`   📁 Components path: ${autoDetected.componentsPath}`);
    }
  }

  const answers = await inquirer.prompt<SetupAnswers>([
    {
      type: 'list',
      name: 'designSystem',
      message: 'Which design system are you using?',
      choices: [
        { name: '🤖 Auto-detect from package.json', value: 'auto' },
        { name: '🎨 Material-UI (@mui/material)', value: 'mui' },
        { name: '⚡ Chakra UI (@chakra-ui/react)', value: 'chakra' },
        { name: '🐜 Ant Design (antd)', value: 'antd' },
        { name: '🎯 Mantine (@mantine/core)', value: 'mantine' },
        { name: '🔧 Custom/Other', value: 'custom' }
      ],
      default: autoDetected ? 'auto' : 'custom'
    },
    {
      type: 'input',
      name: 'importPath',
      message: 'What is the import path for your components?',
      when: (answers) => answers.designSystem === 'custom',
      validate: (input) => input.trim() ? true : 'Import path is required'
    },
    {
      type: 'input',
      name: 'componentPrefix',
      message: 'Do your components have a prefix? (e.g., "AL" for ALButton)',
      when: (answers) => answers.designSystem === 'custom',
      default: ''
    },
    {
      type: 'input',
      name: 'generatedStoriesPath',
      message: 'Where should generated stories be saved?',
      default: './src/stories/generated/',
      validate: (input) => input.trim() ? true : 'Path is required'
    },
    {
      type: 'input',
      name: 'componentsPath',
      message: 'Where are your component files located?',
      default: './src/components',
      when: (answers) => answers.designSystem === 'custom'
    }
  ]);

  // Generate configuration
  let config: any = {};

  if (answers.designSystem === 'auto' && autoDetected) {
    config = autoDetected;
  } else if (answers.designSystem === 'mui') {
    config = {
      importPath: '@mui/material',
      componentPrefix: '',
      layoutRules: {
        multiColumnWrapper: 'Grid',
        columnComponent: 'Grid',
        containerComponent: 'Container',
        layoutExamples: {
          twoColumn: `<Grid container spacing={2}>
  <Grid item xs={6}>
    <Card>
      <CardContent>
        <Typography variant="h5">Left Card</Typography>
        <Typography>Left content</Typography>
      </CardContent>
    </Card>
  </Grid>
  <Grid item xs={6}>
    <Card>
      <CardContent>
        <Typography variant="h5">Right Card</Typography>
        <Typography>Right content</Typography>
      </CardContent>
    </Card>
  </Grid>
</Grid>`
        }
      }
    };
  } else if (answers.designSystem === 'chakra') {
    config = {
      importPath: '@chakra-ui/react',
      componentPrefix: '',
      layoutRules: {
        multiColumnWrapper: 'SimpleGrid',
        columnComponent: 'Box',
        containerComponent: 'Container'
      }
    };
  } else if (answers.designSystem === 'antd') {
    config = {
      importPath: 'antd',
      componentPrefix: '',
      layoutRules: {
        multiColumnWrapper: 'Row',
        columnComponent: 'Col',
        containerComponent: 'div'
      }
    };
  } else if (answers.designSystem === 'mantine') {
    config = {
      importPath: '@mantine/core',
      componentPrefix: '',
      layoutRules: {
        multiColumnWrapper: 'SimpleGrid',
        columnComponent: 'div',
        containerComponent: 'Container'
      }
    };
  } else {
    // Custom configuration
    config = {
      importPath: answers.importPath,
      componentPrefix: answers.componentPrefix || '',
      componentsPath: answers.componentsPath ? path.resolve(answers.componentsPath) : undefined,
      layoutRules: {
        multiColumnWrapper: 'div',
        columnComponent: 'div',
        containerComponent: 'div',
        layoutExamples: {
          twoColumn: `<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
  <div>Column 1 content</div>
  <div>Column 2 content</div>
</div>`
        }
      }
    };
  }

  // Add common configuration
  config.generatedStoriesPath = path.resolve(answers.generatedStoriesPath || './src/stories/generated/');
  config.storyPrefix = 'Generated/';
  config.defaultAuthor = 'Story UI AI';

  // Create configuration file
  const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
  const configPath = path.join(process.cwd(), 'story-ui.config.js');

  fs.writeFileSync(configPath, configContent);

  // Create generated stories directory
  const storiesDir = path.dirname(config.generatedStoriesPath);
  if (!fs.existsSync(storiesDir)) {
    fs.mkdirSync(storiesDir, { recursive: true });
  }

  // Create .gitignore entry for generated stories
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const generatedPattern = path.relative(process.cwd(), config.generatedStoriesPath);

    if (!gitignoreContent.includes(generatedPattern)) {
      fs.appendFileSync(gitignorePath, `\n# Story UI generated stories\n${generatedPattern}\n`);
      console.log(chalk.green(`✅ Added ${generatedPattern} to .gitignore`));
    }
  }

  console.log(chalk.green.bold('\n🎉 Setup complete!\n'));
  console.log(`📁 Configuration saved to: ${chalk.cyan(configPath)}`);
  console.log(`📁 Generated stories will be saved to: ${chalk.cyan(config.generatedStoriesPath)}`);

  if (config.importPath) {
    console.log(`📦 Import path: ${chalk.cyan(config.importPath)}`);
  }

  console.log('\n🚀 Next steps:');
  console.log('1. Start your Storybook: npm run storybook');
  console.log('2. Start Story UI: npx story-ui dev');
  console.log('3. Open the Story UI interface in your Storybook sidebar');

  console.log('\n💡 Tips:');
  console.log('- Generated stories are automatically excluded from git');
  console.log('- You can modify story-ui.config.js to customize the configuration');
  console.log('- Use the Story UI interface to generate new component stories');
}
