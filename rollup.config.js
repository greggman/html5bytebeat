import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', {encoding: 'utf8'}));
const banner = `/* ByteBeat@${pkg.version}, license MIT */`;

export default [
  {
    input: 'src/ByteBeatNode.js',
    output: [
      {
        format: 'umd',
        name: 'ByteBeatNode',
        file: 'dist/1.x/ByteBeat.js',
        indent: '  ',
        banner,
      },
      {
        format: 'es',
        file: 'dist/1.x/ByteBeat.module.js',
        indent: '  ',
        banner,
      },
    ],
  },
];
