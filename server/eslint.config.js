// .eslintrc.mjs
export default {
  // Files this configuration applies to
  files: ["*.js", "*.mjs", "*.cjs"],

  // Language options
  languageOptions: {
    ecmaVersion: 2021,  // ECMAScript syntax version
    sourceType: "module", // Common for ES6 modules

    // Globals can be defined here, if you have any
    globals: {
      process: "readonly",
      require: "readonly",
      module: "readonly",
      __dirname: "readonly",
      __filename: "readonly"
    },
  },

  // ESLint rules
  rules: {
    indent: ["error", 2],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    "space-before-function-paren": ["error", "always"],
    "space-before-blocks": ["error", "always"],
    "keyword-spacing": ["error", { before: true, after: true }],
    "space-infix-ops": ["error", { int32Hint: false }],
    "comma-spacing": ["error", { before: false, after: true }],
    "semi-spacing": ["error", { before: false, after: true }],
    "no-trailing-spaces": ["error"],
    "space-in-parens": ["error", "never"],
    "array-bracket-spacing": ["error", "never"],
    "object-curly-spacing": ["error", "always"],
    "block-spacing": ["error", "always"],
    "no-multiple-empty-lines": ["error", { max: 1 }],
    "padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: "*", next: "return" }
    ]
  }
};
