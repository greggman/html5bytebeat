import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', {encoding: 'utf8'}));
const banner = `/* ByteBeat@${pkg.version}, license MIT */`;
const version = /^(\d+)\./.exec(pkg.version)[1];

export default [
  {
    input: 'src/ByteBeatNode.js',
    output: [
      {
        format: 'umd',
        name: 'ByteBeatNode',
        file: `dist/${version}.x/ByteBeat.js`,
        indent: '  ',
        banner,
      },
      {
        format: 'es',
        file: `dist/${version}.x/ByteBeat.module.js`,
        indent: '  ',
        banner,
      },
    ],
  },
];
