const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const target = (env && env.target) ? env.target : 'chrome';
  const outputPath = path.resolve(__dirname, `../dist/${target}`);

  return {
    devtool: false,
    entry: {
      background: path.resolve(__dirname, '../src/background/index.js'),
      content: path.resolve(__dirname, '../src/content_scripts/index.js'),
    },
    output: {
      path: outputPath,
      filename: '[name].js',
      chunkFilename: 'chunks/[name].js',
      // Content scripts have no document.currentScript, so webpack's default
      // publicPath:'auto' runtime throws "Automatic publicPath is not supported".
      // Disable auto-detection; the content entry sets __webpack_public_path__ at
      // runtime to chrome.runtime.getURL('/') before any dynamic import().
      publicPath: '',
    },
    resolve: {
      extensions: ['.js', '.ts'],
    },
    module: {
      rules: [
        {
          test: /\.[jt]s$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          },
        },
      ],
    },
    target: 'web',
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, `manifest.${target}.json`),
            to: path.resolve(outputPath, 'manifest.json'),
          },
          {
            from: path.resolve(__dirname, '../src/icons'),
            to: path.resolve(outputPath, 'icons'),
          },
          {
            from: path.resolve(__dirname, '../src/pages'),
            to: path.resolve(outputPath, 'pages'),
          },
          {
            from: path.resolve(__dirname, '../src/content_scripts/content.css'),
            to: path.resolve(outputPath, 'content.css'),
          },
          {
            // PDF viewer engine (Wave 8) — copied verbatim; pages/pdf.js imports it
            from: path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.min.mjs'),
            to: path.resolve(outputPath, 'pages/pdfjs/pdf.min.mjs'),
          },
          {
            from: path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
            to: path.resolve(outputPath, 'pages/pdfjs/pdf.worker.min.mjs'),
          },
          {
            // Markdown preview renderer (Wave 8) — core/markdown.js exposed as
            // a browser global by the dual-export shim inside the file.
            from: path.resolve(__dirname, '../src/core/markdown.js'),
            to: path.resolve(outputPath, 'pages/markdown-renderer.js'),
          },
        ],
      }),
    ],
  };
};
