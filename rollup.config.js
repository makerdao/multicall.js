import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify-es';
import babel from 'rollup-plugin-babel';
import bundleSize from 'rollup-plugin-bundle-size';
import builtins from 'rollup-plugin-node-builtins';

module.exports = [
  {
    input: 'src/index.js',
    plugins: [
      builtins(),
      babel({
        runtimeHelpers: true,
        exclude: 'node_modules/**'
      }),
      json(),
      resolve(),
      commonjs({
        namedExports: {
          'node_modules/js-sha3/src/sha3.js': ['keccak256']
        }
      }),
      bundleSize(),
      uglify()
    ],
    output: {
      file: 'dist/build.esm.js',
      // name: 'multicall',
      format: 'es'
    }
  },
  {
    input: 'src/index.js',
    plugins: [
      builtins(),
      babel({
        runtimeHelpers: true,
        exclude: 'node_modules/**'
      }),
      json(),
      resolve(),
      commonjs({
        namedExports: {
          'node_modules/js-sha3/src/sha3.js': ['keccak256']
        }
      }),
      bundleSize(),
      uglify()
    ],
    output: {
      file: 'dist/build.umd.js',
      name: 'multicall',
      format: 'umd'
    }
  }
];
