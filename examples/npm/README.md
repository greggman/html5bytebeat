# html5bytebeat via npm

Normally you'd add bytebeat.js to your project

```sh
npm install bytebeat.js
```

and then setup your builder (webpack, rollup, parcel, etc..)
so you should be able to import the library with

```js
import ByteBeatNode from 'bytebeat.js';
```

## Working example

Steps

```sh
git clone https://github.com/greggman/html5bytebeat.git
cd html5bytebeat/examples/npm
npm i
npm run build
```

This should build `index-build.js` via rollup.

Then do

```sh
npx servez
```

Then to go to [`http://localhost:8080`](http://localhost:8080) in your browser.

