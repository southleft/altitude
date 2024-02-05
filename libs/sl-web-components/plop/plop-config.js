module.exports = (plop) => {
  // Add uppercase functionality for component boilerplate
  plop.setHelper('upperCase', (txt) => txt.toUpperCase());

  plop.setGenerator('component', {
    description: 'Create a component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the component name? Note: Name must be in dash case. (e.g. "component-name")'
      }
    ],
    actions: [
      {
        type: 'add',
        path: './../components/{{dashCase name}}/{{dashCase name}}.ts',
        templateFile: 'templates/component/component.ts.hbs'
      },
      {
        type: 'add',
        path: './../components/{{dashCase name}}/{{dashCase name}}.stories.ts',
        templateFile: 'templates/component/component.stories.ts.hbs'
      },
      {
        type: 'add',
        path: './../components/{{dashCase name}}/{{dashCase name}}.scss',
        templateFile: 'templates/component/component.scss.hbs'
      }
    ]
  });

  plop.setGenerator('recipe', {
    description: 'Create a recipe',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the recipe name? Note: Name must be in dash case. (e.g. "recipe-name")'
      }
    ],
    actions: [
      {
        type: 'add',
        path: './../.storybook/recipes/{{dashCase name}}/{{dashCase name}}.ts',
        templateFile: 'templates/recipe/recipe.ts.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/recipes/{{dashCase name}}/{{dashCase name}}.stories.ts',
        templateFile: 'templates/recipe/recipe.stories.ts.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/recipes/{{dashCase name}}/{{dashCase name}}.scss',
        templateFile: 'templates/recipe/recipe.scss.hbs'
      }
    ]
  });

  plop.setGenerator('page', {
    description: 'Create a page',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the page name? Note: Name must be in dash case. (e.g. page-name)'
      }
    ],
    actions: [
      {
        type: 'add',
        path: './../.storybook/pages/{{dashCase name}}/{{dashCase name}}.ts',
        templateFile: 'templates/page/page.ts.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/pages/{{dashCase name}}/{{dashCase name}}.stories.ts',
        templateFile: 'templates/page/page.stories.ts.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/pages/{{dashCase name}}/{{dashCase name}}.scss',
        templateFile: 'templates/page/page.scss.hbs'
      }
    ]
  });
};
