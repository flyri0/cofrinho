module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Lets drizzle/migrations.js `import` the generated .sql files as raw text.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
