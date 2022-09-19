//import resolve from 'rollup-plugin-node-resolve';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', {encoding: 'utf8'}));
const banner = `/* ByteBeat@${pkg.version}, license MIT */`;

export default [
  {
    input: 'src/ByteBeatNode.js',
//    plugins: [
//      resolve({
//        modulesOnly: true,
//      }),
//    ],
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
