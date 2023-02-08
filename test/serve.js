/* global require */
/* global __dirname */
const Servez = require('servez-lib');
const open = require('open');

const root = `${__dirname}/..`;
const dataDir = '';

const server = new Servez(Object.assign({
  root,
  dataDir,
  port: 8080,
  logger: {
    log: console.log.bind(console),
    error: console.error.bind(console),
  },
}));

//server.on('host', (...args) => console.log('host', JSON.stringify(args, null, 2)));
server.on('start', async({baseUrl}) => {
  const url = `${baseUrl}/html5bytebeat.html`;
  console.log('open:', url);
  await open(url);
});
