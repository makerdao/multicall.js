import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';
import json from 'rollup-plugin-json';
import commonjs from 'rollup-plugin-commonjs';
import bundleSize from 'rollup-plugin-bundle-size';

import pkg from './package.json';

const extensions = ['.js'];
const babelRuntimeVersion = pkg.dependencies['@babel/runtime'].replace(/^[^0-9]*/, '');

const makeExternalPredicate = externalArr => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join('|')})($|/)`);
  return id => pattern.test(id);
};

export default [
  // CommonJS
  {
    input: 'src/index.js',
    output: { file: 'dist/multicall.cjs.js', format: 'cjs', indent: false, sourcemap: true },
    external: makeExternalPredicate([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ]),
    plugins: [
      json(),
      nodeResolve({
        extensions
      }),
      babel({
        extensions,
        plugins: [['@babel/plugin-transform-runtime', { version: babelRuntimeVersion }]],
        runtimeHelpers: true
      }),
      bundleSize()
    ]
  },

  // ESM
  {
    input: 'src/index.js',
    output: { file: 'dist/multicall.esm.js', format: 'es', indent: false, sourcemap: true },
    external: makeExternalPredicate([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ]),
    plugins: [
      json(),
      nodeResolve({
        extensions
      }),
      babel({
        extensions,
        plugins: [
          ['@babel/plugin-transform-runtime', { version: babelRuntimeVersion, useESModules: true }]
        ],
        runtimeHelpers: true
      }),
      bundleSize()
    ]
  },

  // UMD
  {
    input: 'src/index.js',
    output: {
      file: 'dist/multicall.umd.js',
      format: 'umd',
      name: 'Multicall',
      indent: false,
      sourcemap: true
    },
    plugins: [
      json(),
      nodeResolve({
        extensions,
        browser: true
      }),
      commonjs(),
      babel({
        extensions,
        exclude: 'node_modules/**'
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      }),
      bundleSize()
    ]
  }
];
