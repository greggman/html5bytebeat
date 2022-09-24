import {createElem as el} from './elem.js';
import {
  typeParamToTypeName,
  expressionTypeParamToExpressionName,
} from './utils.js';

function sampleRateParamToSampleRate(s) {
  const sampleRate = parseInt(s);
  return `${sampleRate / 1000 | 0}k`;
}

function valueOrDefault(v, defaultV) {
  return v === undefined ? defaultV : v;
}

const thePTB = -1;//234804;
function score({user, reactions, groupSize/*, link*/}) {
  //const lenHack = 10000000;
  return (user.id === thePTB ? 1000000 : 0) +
      (reactions['+1'] +
       reactions['laugh'] +
       reactions['heart'] +
       reactions['hooray'] -
       reactions['-1']) / groupSize +
       //lenHack / link.length / lenHack +
       0;
}

/*
const reactionMap = new Map([
  ['+1', '👍'],
  ['laugh', '🤣'],
  ['heart', '❤️'],
  ['hooray', '🎉'],
]);
function makeReactions(reactions, groupSize, user) {
  const scores = [];
  for (const [reaction, count] of Object.entries(reactions)) {
    const emoji = reactionMap.get(reaction);
    if (emoji) {
      const score = user === thePTB ? count : count / groupSize;
      if (score >= 1) {
        scores.push(`${emoji}(${score | 0})`);
      }
    }
  }
  return scores.join('');
}
*/
function makeReactions() {
  return '';
}

export default async function loadSongs() {
  const showSongsElem = document.querySelector('#showSongs');
  try {
    //const url = 'editor/songs.json';
    const url = 'https://greggman.github.io/html5bytebeat/editor/songs.json';

    const res = await fetch(url);
    const songs = await res.json();
    const localBase = `${window.location.origin}${window.location.pathname}`;
    const origBase = 'https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html';
    const songsElem = document.querySelector('#songs');
    const songListElem = songsElem.querySelector('#song-list');

    const sortedSongs = songs.slice().sort((a, b) => {
      const scoreA = score(a);
      const scoreB = score(b);
      return Math.sign(scoreB - scoreA);
    });

    const categories = {};
    for (const {title, link, reactions, groupSize, user} of sortedSongs) {
      const url = new URL(link);
      const q = Object.fromEntries(new URLSearchParams(url.hash.substring(1)).entries());
      const type = typeParamToTypeName(valueOrDefault(q.t, 1));
      const expressionType = expressionTypeParamToExpressionName(valueOrDefault(q.e, 0));
      const sampleRate = sampleRateParamToSampleRate(valueOrDefault(q.s, 8000));
      const subCategory = categories[type] || {};
      categories[type] = subCategory;
      const subSongs = subCategory[expressionType] || [];
      subCategory[expressionType] = subSongs;
      const reaction = makeReactions(reactions, groupSize, user);
      subSongs.push({title: `${reaction}${title}`, link, sampleRate});
    }

    const currentHref = window.location.href.replace(origBase, localBase);
    let count = 0;
    for (const [category, subCategories] of Object.entries(categories)) {
      const details = el('details', {className: 'category', open: true}, [
          el('summary', {textContent: category}),
          el('div', {}, [...Object.entries(subCategories)].map(([subCategory, songs]) =>
            el('details', {className: 'sub-category', open: true}, [
              el('summary', {textContent: subCategory}),
              el('div', {}, songs.map(({title, link, sampleRate}) => {
                ++count;
                const href = link.replace(origBase, localBase);
                return el('a', {
                  ...((count & 1) === 0 && {className: 'odd'}),
                  href,
                  textContent: `${title} (${sampleRate})`,
                  onClick: highlightLink,
                  ...(href === currentHref && {classList: 'highlight'}),
                });
              })),
            ]),
          )),
      ]);
      songListElem.appendChild(details);
      const elem = document.querySelector('.highlight');
      if (elem) {
        // If a match was found scroll it into view in the song list
        // We have to make the song list visible for scrollInfoView to
        // work.
        songsElem.style.display = '';
        elem.scrollIntoView();
        songsElem.style.display = 'none';
      }
    }

    function highlightLink() {
      const links = songsElem.querySelectorAll('a');
      for (const link of links) {
        link.classList.toggle('highlight', link === this);
      }
    }

    const searchElem = document.querySelector('#search');
    function search() {
      const str = searchElem.value.toLowerCase();
      const links = songsElem.querySelectorAll('a');

      links.forEach(function(link, ndx){
        const text = link.textContent.toLowerCase();
        if (str.length && !text.includes(str)) {
          link.classList.add('hide');
        } else {
          link.classList.remove('hide');
        }
        link.classList.toggle('odd', ndx & 1);
      });
    }

    searchElem.addEventListener('keyup', search);

    showSongsElem.addEventListener('click', () => {
      const show = !!songsElem.style.display;
      songsElem.style.display = show ? '' : 'none';
      showSongsElem.textContent = show ? '▼ beats' : '▶ beats';
    });
  } catch (e) {
    console.error(`could not load songs.json: ${e}`);
    showSongsElem.style.display = 'none';
  }
}
