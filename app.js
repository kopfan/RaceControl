const express = require('express');
const chalk = require('chalk');
const debug = require('debug')('app');
const morgan = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');

// const session = require('express-session');

const app = express();

// add socket.io
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;

app.use(morgan('tiny'));

app.use(bodyParser.json()); // to parse POST data by forms
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, '/public/')));
app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/jquery/dist')));

// to enable socket.io js download by client
app.use('/js', express.static(path.join(__dirname, '/node_modules/socket.io-client/dist')));

app.set('views', './src/views');
app.set('view engine', 'ejs');

const nav = [
  { link: '/', title: 'Home' },
  { link: '/stages/starter', title: 'Starter' },
  { link: '/stages/finisher', title: 'Finisher' },
  { link: '/stages/monitor', title: 'Monitor' },
];

const stageRouter = require('./src/routes/stageRoutes')(nav, io);

app.use('/stages', stageRouter);

app.get('/', (req, res) => {
  res.render(
    'index',
    {
      nav,
      title: 'Home',
      active: true,
    },
  );
});

server.listen(port, () => {
  debug(`Server ${chalk.green('ready')}`);
  debug(`Server ${chalk.green('running on port ')} ${chalk.red(port)}`);
});
