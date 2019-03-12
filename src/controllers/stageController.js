const { MongoClient, ObjectID } = require('mongodb');
const debug = require('debug')('app:stageController');

function stageController(stageService, nav, io) {

  // TODO: bring this socket.io mechanism to stageController & stageService

  io.on('connection', (client) => {
    debug('Client connected...');

    client.on('join', (data) => {
      debug(data);
    });

    client.on('messages', (data) => {
      debug(data);
      client.emit('broad', data);
      client.broadcast.emit('broad', data);

      // handle input messages

      const messageObject = JSON.parse(data);
      const command = messageObject.message.command;
      const starterNumber = messageObject.message.starter_number;

      debug(`command: ${command}`);

      // call stageService to perist the data
      if (command === 'started') {
        stageService.storeStartDataObject(data);
      } else if (command === 'finished') {
        stageService.storeFinishData(data);
        debug(`stageTimeServer = ${stageService.getStageResultTmp(data)}`);
      }
    });
  });

  function starter(req, res) {
    res.render('starter', {
      nav,
      title: 'Starter',
      active: false,
    });
    debug(`get /starter: req=${req.rawHeaders}, res=${res}`);
  }

  // deprecated: no longer needed as the app will communicate over socket.io and not over http-links
  function started(req, res) {
    const { starterNumber } = req.body;

    const date = stageService.getServerTime();

    const racer = {
      starterNumber,
      startTime: date,
    };

    const url = 'mongodb://localhost:27017';
    const dbName = 'timetracker';

    (async function mongo() {
      let client;
      try {
        client = await MongoClient.connect(url);
        debug('Connected correctly to server');

        const db = client.db(dbName);

        const response = await db.collection('racer').insertOne(racer);
        debug(response);
      } catch (err) {
        debug(err.stack);
      }

      client.close();
    }());

    debug(`StarterNumber = ${starterNumber}`);
    res.redirect('/stages/starter');
  }
  function monitor(req, res) {
    res.render('monitor', {
      nav,
      title: 'Monitor',
      active: false,
    });
  }
  function finisher(req, res) {
    res.render('finisher', {
      nav,
      title: 'Finisher',
      active: false,
    });
  }
  function middleware(req, res, next) {
    debug('function middleware called...');
    // if (req.user) {
    next();
    // } else {
    // res.redirect('/');
    // }
  }
  return {
    starter,
    started,
    finisher,
    monitor,
    middleware,
  };
}

module.exports = stageController;
