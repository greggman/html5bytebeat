import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.js',
    plugins: [
      resolve({
        modulesOnly: true,
      }),
    ],
    output: [
      {
        format: 'iife',
        file: 'index-build.js',
      },
    ],
  },
];
