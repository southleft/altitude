module.exports = (plop) => {
  plop.setHelper('upperCase', (txt) => txt.toUpperCase());

  plop.setGenerator('component', {
    description: 'Create a component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the component name? Note: Name must be in pascal case. (e.g. ComponentName)'
      }
    ],
    actions: [
      {
        type: 'add',
        path: './../src/components/{{pascalCase name}}/index.tsx',
        template: "export * from './{{pascalCase name}}';"
      },
      {
        type: 'add',
        path: './../src/components/{{pascalCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'templates/component/Component.tsx.hbs'
      },
      {
        type: 'add',
        path: './../src/components/{{pascalCase name}}/{{pascalCase name}}.stories.tsx',
        templateFile: 'templates/component/Component.stories.tsx.hbs'
      },
      {
        type: 'append',
        path: './../src/index.ts',
        template: "export * from './components/{{pascalCase name}}';"
      }
    ]
  });

  plop.setGenerator('recipe', {
    description: 'Create a recipe',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the recipe name? Note: Name must be in pascal case. (e.g. RecipeName)'
      }
    ],
    actions: [
      {
        type: 'add',
        path: './../.storybook/recipe/{{pascalCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'templates/recipe/Recipe.tsx.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/recipe/{{pascalCase name}}/{{pascalCase name}}.stories.tsx',
        templateFile: 'templates/recipe/Recipe.stories.tsx.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/recipe/{{pascalCase name}}/{{pascalCase name}}.scss',
        templateFile: 'templates/recipe/Recipe.scss.hbs'
      }
    ]
  });

  plop.setGenerator('page', {
    description: 'Create a page',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the page name? Note: Name must be in pascal case. (e.g. PageName)'
      }
    ],
    actions: [
      {
        type: 'add',
        path: './../.storybook/page/{{pascalCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'templates/page/Page.tsx.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/page/{{pascalCase name}}/{{pascalCase name}}.stories.tsx',
        templateFile: 'templates/page/Page.stories.tsx.hbs'
      }
    ]
  });
};
