/* global require, process, __dirname */
const { Octokit } = require('octokit');
const fs = require('fs');
const path = require('path');
const lzma = require('lzma');

async function getComments() {
  if (process.argv[2]) {
    const body = fs.readFileSync(process.argv[2], {encoding: 'utf-8'});
    return [
      {
        body,
        reactions: {},
        user: {
          id: 123,
          login: 'gman',
        },
      },
    ];
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error('must set GH_TOKEN');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }


  const octokit = new Octokit({
    auth: token,
  });

  const comments = await octokit.paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner: 'greggman',
    repo: 'html5bytebeat',
    issue_number: '17',
    headers: {
      Accept: 'application/vnd.github.raw+json',
    },
  });
  return comments;
}

function convertHexToBytes(text) {
  const array = [];
  for (let i = 0; i < text.length; i += 2) {
    const tmpHex = text.substring(i, i + 2);
    array.push(parseInt(tmpHex, 16));
  }
  return array;
}

function readURL(hash) {
  const args = hash.split('&');
  const data = {};
  for (let i = 0; i < args.length; ++i) {
    const parts = args[i].split('=');
    data[parts[0]] = parts[1];
  }
  const t = data.t !== undefined ? parseFloat(data.t) : 1;
  const e = data.e !== undefined ? parseFloat(data.e) : 0;
  const s = data.s !== undefined ? parseFloat(data.s) : 8000;
  const bytes = convertHexToBytes(data.bb);
  const code = lzma.decompress(bytes);
  return {t, e, s, code};
}

function removeCommentsAndLineBreaks(x) {
  // remove comments (hacky)
  x = x.replace(/\/\/.*/g, ' ');
  x = x.replace(/\n/g, ' ');
  x = x.replace(/\/\*.*?\*\//g, ' ');
  return x;
}

function minimize(code) {
  return removeCommentsAndLineBreaks(code).trim().replace(/\s\s+/g, ' ');
}

async function main() {
  const comments = await getComments();

  const linkRE = /\[(.*?)\]\((https:\/\/greggman\.com\/downloads\/examples\/html5bytebeat\/html5bytebeat\.html#.*?)\)/g;
  const songs = [];
  for (const {body, reactions, user} of comments) {
    const results = [...body.matchAll(linkRE)];
    const {login, id} = user;
    songs.push(...results.map(([, title, link]) => {
      const {code} = readURL(link.substring(link.indexOf('#') + 1));
      const size = minimize(code).length;
      return {title, size, link, reactions, groupSize: results.length, user: {login, id}};
    }));
  }

  const filename = path.join(__dirname, '..', 'editor', 'songs.json');
  console.log(`writing ${songs.length} song to ${filename}`);
  const extraArgs = process.argv[2] ? [null, 2] : [];
  fs.writeFileSync(filename, JSON.stringify(songs, ...extraArgs));
}

main();
