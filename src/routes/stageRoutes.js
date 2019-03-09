const express = require('express');
// const { MongoClient } = require('mongodb');
const debug = require('debug')('app:stageRoutes');
// const passport = require('passport');

const stageService = require('../services/stageService');
const stageController = require('../controllers/stageController');

const stageRouter = express.Router();

function router(nav, io) {
  debug(nav);

  const { starter, started, finisher, monitor, middleware } = stageController(stageService, nav, io);
  stageRouter.use(middleware);

  stageRouter.route('/starter')
    .get(starter);

  stageRouter.route('/started')
    .post(started);

  stageRouter.route('/finisher')
    .get(finisher);

  stageRouter.route('/monitor')
    .get(monitor);

  return stageRouter;
}

module.exports = router;
