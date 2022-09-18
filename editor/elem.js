export function setElemProps(elem, attrs, children) {
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function' && key.startsWith('on')) {
      const eventName = key.substring(2).toLowerCase();
      elem.addEventListener(eventName, value, {passive: false});
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        elem[key][k] = v;
      }
    } else if (elem[key] === undefined) {
      elem.setAttribute(key, value);
    } else {
      elem[key] = value;
    }
  }
  for (const child of children) {
    elem.appendChild(child);
  }
  return elem;
}

export function createElem(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  setElemProps(elem, attrs, children);
  return elem;
}

export function addElem(tag, parent, attrs = {}, children = []) {
  const elem = createElem(tag, attrs, children);
  parent.appendChild(elem);
  return elem;
}