import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
// import uglify from 'rollup-plugin-uglify-es';
import babel from 'rollup-plugin-babel';
import bundleSize from 'rollup-plugin-bundle-size';

module.exports = {
  input: 'src/index.js',
  plugins: [
    json(),
    resolve(),
    commonjs({
      namedExports: {
        'node_modules/js-sha3/src/sha3.js': ['keccak256']
      }
    }),
    bundleSize(),
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**'
    })
    // uglify()
  ],
  output: {
    file: 'index.js',
    format: 'cjs'
  }
};
