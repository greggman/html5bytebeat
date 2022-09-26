export const s_beatTypes = ['bytebeat', 'floatbeat', 'signed bytebeat'];
export function typeParamToTypeName(s) {
  return s_beatTypes[parseInt(s)];
}

export const s_expressionTypes = ['infix', 'postfix(rpn)', 'glitch', 'function'];
export function expressionTypeParamToExpressionName(s) {
  return s_expressionTypes[parseInt(s)];
}

export function convertHexToBytes(text) {
  const array = [];
  for (let i = 0; i < text.length; i += 2) {
    const tmpHex = text.substring(i, i + 2);
    array.push(parseInt(tmpHex, 16));
  }
  return array;
}

export function convertBytesToHex(byteArray) {
  let hex = '';
  const il = byteArray.length;
  for (let i = 0; i < il; i++) {
    if (byteArray[i] < 0) {
      byteArray[i] = byteArray[i] + 256;
    }
    let tmpHex = byteArray[i].toString(16);
    // add leading zero
    if (tmpHex.length === 1) {
      tmpHex = '0' + tmpHex;
    }
    hex += tmpHex;
  }
  return hex;
}

// Splits a string, looking for //:name
const g_splitRE = new RegExp(/\/\/:([a-zA-Z0-9_-]+)(.*)/);
const g_headerRE = new RegExp(/^\/\/ ([a-zA-Z0-9_-]+): (\S.*?)$/gm);

export function splitBySections(str) {
  const sections = {};

  {
    const matches = str.matchAll(g_headerRE);
    for (const m of matches) {
      sections[m[1]] = { argString: m[2].trim(), body: '' };
    }
  }

  function getNextSection(str) {
    const pos = str.search(g_splitRE);
    if (pos < 0) {
      return str;
    }
    const m = str.match(g_splitRE);
    const sectionName = m[1];
    const newStr = getNextSection(str.substring(pos + 3 + sectionName.length));
    sections[sectionName] = {
      argString: m[2].trim(),
      body: newStr,
    };
    return str.substring(0, pos);
  }
  str = getNextSection(str);
  if (str.length) {
    sections.default = {
      body: str,
    };
  }
  return sections;
}

export function makeExposedPromise() {
  const p = {};
  p.promise = new Promise((resolve, reject) => {
    p.resolve = resolve;
    p.reject = reject;
  });
  return p;
}