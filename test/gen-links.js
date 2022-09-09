/* global require, __dirname */
/*
extracts the links from the README and outputs an HTML file to stdout

run with

    node tools/gen-links.js > someFile.html
*/
const fs = require('fs');
const path = require('path');

const str = fs.readFileSync(path.join(__dirname, '..', 'README.md'), {encoding: 'utf-8'});
const links = [...str.matchAll(/\[(.*?)\].*?(html5bytebeat.html#.*?)\)/g)].map(m => {
  const [, name, link] = m;
  return `<li><a href="../${link}">${name}</a></li>`;
}).join('\n');

const html = `
<ul>
${links}
</ul>
`;
console.log(html);
