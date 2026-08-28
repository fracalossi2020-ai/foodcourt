const js = require("./Backend/node_modules/@eslint/js");
const globals = require("./Backend/node_modules/globals");

module.exports = [
  { ignores: ["node_modules/**", "../banco de dados/runtime/**"] },
  js.configs.recommended,
  {
    files: [
      "Backend/src/**/*.js",
      "Backend/scripts/**/*.js",
      "Backend/test/**/*.js",
      "eslint.config.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-control-regex": "off",
    },
  },
  {
    files: ["frontend/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
