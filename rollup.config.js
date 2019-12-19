import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import bundleSize from 'rollup-plugin-bundle-size';
import builtins from 'rollup-plugin-node-builtins';
import autoExternal from 'rollup-plugin-auto-external';
import cleanup from 'rollup-plugin-cleanup';
import minify from 'rollup-plugin-babel-minify';
import globals from 'rollup-plugin-node-globals';

module.exports = [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/build.esm.js',
      format: 'es'
    },
    external: ['cross-fetch', 'debug', 'ethers', 'isomorphic-ws', 'lodash', 'ws'],
    plugins: [
      builtins(),
      babel({
        runtimeHelpers: true,
        exclude: 'node_modules/**'
      }),
      json(),
      cleanup(),
      resolve({
        browser: true
      }),
      commonjs({
        namedExports: {
          'node_modules/js-sha3/src/sha3.js': ['keccak256']
        }
      }),
      bundleSize(),
      minify()
    ]
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/build.cjs.js',
      format: 'cjs'
    },
    plugins: [
      builtins(),
      babel({
        runtimeHelpers: true,
        exclude: 'node_modules/**'
      }),
      json(),
      autoExternal(),
      cleanup(),
      resolve(),
      commonjs({
        namedExports: {
          'node_modules/js-sha3/src/sha3.js': ['keccak256']
        }
      }),
      bundleSize(),
      minify()
    ]
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/build.umd.js',
      name: 'Multicall',
      format: 'umd'
    },
    plugins: [
      babel({
        runtimeHelpers: true,
        exclude: 'node_modules/**'
      }),
      json(),
      cleanup(),
      resolve({
        browser: true
      }),
      commonjs({
        namedExports: {
          'node_modules/js-sha3/src/sha3.js': ['keccak256']
        }
      }),
      globals(),
      bundleSize(),
      minify()
    ]
  }
];
