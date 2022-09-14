/* global require, process, __dirname */
const { Octokit } = require('octokit');
const fs = require('fs');
const path = require('path');

async function main() {
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
  });

  const linkRE = /\[(.*?)\]\((https:\/\/greggman\.com\/downloads\/examples\/html5bytebeat\/html5bytebeat\.html#.*?)\)/g;
  const songs = [];
  for (const {body, reactions, user} of comments) {
    const results = [...body.matchAll(linkRE)];
    const {login, id} = user;
    songs.push(...results.map(([, title, link]) => {
      return {title, link, reactions, groupSize: results.length, user: {login, id}};
    }));
  }

  const filename = path.join(__dirname, '..', 'editor', 'songs.json');
  console.log(`writing ${songs.length} song to ${filename}`);
  fs.writeFileSync(filename, JSON.stringify(songs));
}

main();
