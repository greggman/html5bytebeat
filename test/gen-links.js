/* global require, __dirname */
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
