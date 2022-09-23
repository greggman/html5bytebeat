//import './scrollbars.css';

/*
 * Scrollbar Width Test
 * Adds `layout-scrollbar-obtrusive` class to body if scrollbars use up screen real estate
 */
const parent = document.createElement('div');
parent.setAttribute('style', 'width:30px;height:30px;');
parent.classList.add('scrollbar-test');

const child = document.createElement('div');
child.setAttribute('style', 'width:100%;height:40px');
parent.appendChild(child);
document.body.appendChild(parent);

// Measure the child element, if it is not
// 30px wide the scrollbars are obtrusive.
const scrollbarWidth = 30 - parent.firstChild.clientWidth;
if (scrollbarWidth) {
  document.body.classList.add('layout-scrollbar-obtrusive');
}

document.body.removeChild(parent);