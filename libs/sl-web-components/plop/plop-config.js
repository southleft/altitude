module.exports = (plop) => {
  // Add uppercase functionality for component boilerplate
  plop.setHelper('upperCase', (txt) => txt.toUpperCase());

  plop.setGenerator('component', {
    description: 'Create a reusable component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is your component name (e.g. "checkbox" or "link-list")?'
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

  plop.setGenerator('page', {
    description: 'Create a page template',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is your page name (e.g. "quote-detail")?  Note: name must include a dash.'
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
      }
    ]
  });

  plop.setGenerator('recipe', {
    description: 'Create a recipe',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is your recipe name (e.g. "site-header")? Note: name must include a dash.'
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
};
