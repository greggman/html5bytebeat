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

    const sizeToBin = size => {
      if (size < 256) {
        return 0;
      } else if (size < 1024) {
        return 1;
      } else {
        return 2;
      }
    };

    const sizeBinLabels = ['small(≤256b)', 'medium(≤1k)', 'large(>1k)'];
    const sizeBinToString = bin => sizeBinLabels[bin];

    const categories = {};
    for (const {title, size, link, reactions, groupSize, user} of sortedSongs) {
      const url = new URL(link);
      const q = Object.fromEntries(new URLSearchParams(url.hash.substring(1)).entries());
      const type = typeParamToTypeName(valueOrDefault(q.t, 1));
      const expressionType = expressionTypeParamToExpressionName(valueOrDefault(q.e, 0));
      const sampleRate = sampleRateParamToSampleRate(valueOrDefault(q.s, 8000));
      const subCategory = categories[type] || {};
      categories[type] = subCategory;
      const subSongs = subCategory[expressionType] || [];
      subCategory[expressionType] = subSongs;
      const bin = sizeToBin(size);
      const sizeBin = subSongs[bin] || [];
      subSongs[bin] = sizeBin;
      const reaction = makeReactions(reactions, groupSize, user);
      sizeBin.push({title: `${reaction}${title}`, link, sampleRate});
    }

    function makeSubTree(className, name, children) {
      return el('details', {className, open: true}, [
          el('summary', {textContent: name}),
          el('div', {}, children),
      ]);
    }

    const currentHref = window.location.href.replace(origBase, localBase);

    const makeSongElements = (songs) => {
      return songs.map(({title, link, sampleRate}) => {
        const href = link.replace(origBase, localBase);
        return el('a', {
          href,
          textContent: `${title} (${sampleRate})`,
          onClick: highlightLink,
          ...(href === currentHref && {classList: 'highlight'}),
        });
      });
    };

    const makeSizeBins = (sizeBins) => {
      return sizeBins.filter(b => !!b).map((songs, bin) =>
        makeSubTree('size-bin', sizeBinToString(bin), makeSongElements(songs))
      );
    };

    const makeSubCategories = (subCategories) => {
      return [...Object.entries(subCategories)].map(([subCategory, sizeBins]) =>
        makeSubTree('sub-category', subCategory, makeSizeBins(sizeBins)),
      );
    };

    for (const [category, subCategories] of Object.entries(categories)) {
      const details = makeSubTree('category', category, makeSubCategories(subCategories));
      songListElem.appendChild(details);
    }

    {
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
    search();  // sets odd class on full list

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
