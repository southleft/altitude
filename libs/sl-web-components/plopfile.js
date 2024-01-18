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
        path: 'components/{{dashCase name}}/{{dashCase name}}.ts',
        templateFile: 'plop-templates/component/component.ts.hbs'
      },
      {
        type: 'add',
        path: 'components/{{dashCase name}}/{{dashCase name}}.stories.ts',
        templateFile: 'plop-templates/component/component.stories.ts.hbs'
      },
      {
        type: 'add',
        path: 'components/{{dashCase name}}/{{dashCase name}}.scss',
        templateFile: 'plop-templates/component/component.scss.hbs'
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
        path: '.storybook/pages/{{dashCase name}}/{{dashCase name}}.ts',
        templateFile: 'plop-templates/page/page.ts.hbs'
      },
      {
        type: 'add',
        path: '.storybook/pages/{{dashCase name}}/{{dashCase name}}.stories.ts',
        templateFile: 'plop-templates/page/page.stories.ts.hbs'
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
        path: '.storybook/recipes/{{dashCase name}}/{{dashCase name}}.ts',
        templateFile: 'plop-templates/recipe/recipe.ts.hbs'
      },
      {
        type: 'add',
        path: '.storybook/recipes/{{dashCase name}}/{{dashCase name}}.stories.ts',
        templateFile: 'plop-templates/recipe/recipe.stories.ts.hbs'
      },
      {
        type: 'add',
        path: '.storybook/recipes/{{dashCase name}}/{{dashCase name}}.scss',
        templateFile: 'plop-templates/recipe/recipe.scss.hbs'
      }
    ]
  });

  plop.setGenerator('icon', {
    description: 'Create an icon',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is your icon name (e.g. "arrow-left")?'
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'components/icon/svgs/{{dashCase name}}.svg.ts',
        templateFile: 'plop-templates/icon/icon.svg.ts.hbs'
      },
      {
        type: 'add',
        path: 'components/icon/icons/{{dashCase name}}.ts',
        templateFile: 'plop-templates/icon/icon.ts.hbs'
      },
      {
        type: 'append',
        path: '.storybook/components/icon-grid/icons.ts',
        template: "import '../../../components/icon/icons/{{dashCase name}}';"
      }
    ]
  });
};
