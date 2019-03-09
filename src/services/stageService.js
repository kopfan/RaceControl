const debug = require('debug')('app:stageService');
const { MongoClient, ObjectID } = require('mongodb');

function stageService() {
  function getServerTime() {
    const date = Date.parse(new Date());
    debug(`Date: ${date}`);
    return date;
  }

  function getStageResult(dataObject) {
    // timeStampProvider = client or server, if client use the timestamps from client and vice versa
    const messageObject = JSON.parse(dataObject);
    const starterNumber = messageObject.message.starter_number;
    const raceId = messageObject.message.race_id;
    const raceName = messageObject.message.race_name;
    const stageId = messageObject.message.stage_id;
    const stageName = messageObject.message.stage_name;

    let finishTimeClient = 0;
    let finishTimeServer = 0; 
    
    const url = 'mongodb://localhost:27017';
    const dbName = 'timetracker';

    (async function mongo() {
      let client;
      try {
        client = await MongoClient.connect(url);
        debug('Connected correctly to server');

        const db = client.db(dbName);

        const response = await db.collection('racer').findOne({
          starter_number: starterNumber,
          'races.race_id': raceId,
          'races.race_name': raceName,
          'races.stages.stage_id': stageId,
          'races.stages.stage_name': stageName,
        }, {
          'races.stages.stage_results.stage_start_timestamp_client': 1,
          'races.stages.stage_results.stage_start_timestamp_server': 1,
          'races.stages.stage_results.stage_finish_timestamp_client': 1,
          'races.stages.stage_results.stage_finish_timestamp_server': 1,
        });

        const clientStartTime = response.races.stages.stage_results.stage_start_timestamp_client;
        const serverStartTime = response.races.stages.stage_results.stage_start_timestamp_server;
        const clientFinishTime = response.races.stages.stage_results.stage_finish_timestamp_client;
        const serverFinishTime = response.races.stages.stage_results.stage_finish_timestamp_server;

        debug(`clientStartTime=${clientStartTime}`);
        debug(`serverStartTime=${serverStartTime}`);
        debug(`clientFinishTime=${clientFinishTime}`);
        debug(`serverFinishTime=${serverFinishTime}`);

        finishTimeClient = response.races.stages.stage_results.stage_finish_timestamp_client - response.races.stages.stage_results.stage_start_timestamp_client;
        finishTimeServer = response.races.stages.stage_results.stage_finish_timestamp_server - response.races.stages.stage_results.stage_start_timestamp_server;

        debug(`finishTimeClient=${finishTimeClient}`);
        debug(`finishTimeServer=${finishTimeServer}`);

        // this is most propably very bad code!!!!!! -> return befor client.close and error handling
        return [finishTimeClient, finishTimeServer];
      } catch (err) {
        debug(err.stack);        
      }
      client.close();
    }());
  }

  // deprecated
  function storeStartData(starterNumber) {
    const date = getServerTime();

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
        debug(`DB-Result: ${response.result.ok}`);
      } catch (err) {
        debug(err.stack);
      }

      client.close();
    }());
  }

  function storeStartDataObject(dataObject) {
    const messageObject = JSON.parse(dataObject);
    const starterNumber = messageObject.message.starter_number;
    const timestampClient = messageObject.message.timestamp_client;
    const raceId = messageObject.message.race_id;
    const raceName = messageObject.message.race_name;
    const stageId = messageObject.message.stage_id;
    const stageName = messageObject.message.stage_name;

    const starter = {
      starter_number: starterNumber,
      races: {
        race_id: raceId,
        race_name: raceName,
        stages: {
          stage_id: stageId,
          stage_name: stageName,
          stage_results: {
            stage_start_timestamp_client: timestampClient,
            stage_start_timestamp_server: getServerTime(),
          },
        },
      },
    };

    const url = 'mongodb://localhost:27017';
    const dbName = 'timetracker';

    (async function mongo() {
      let client;
      try {
        client = await MongoClient.connect(url);
        debug('Connected correctly to server');

        const db = client.db(dbName);

        const response = await db.collection('racer').insertOne(starter);
        debug(`DB-Result: ${response.result.ok}`);
      } catch (err) {
        debug(err.stack);
      }

      client.close();
    }());
  }

  function storeFinishData(dataObject) {
    // search starterNumber in DB and update the record

    const messageObject = JSON.parse(dataObject);
    const starterNumber = messageObject.message.starter_number;
    const timestampClient = messageObject.message.timestamp_client;
    const raceId = messageObject.message.race_id;
    const raceName = messageObject.message.race_name;
    const stageId = messageObject.message.stage_id;
    const stageName = messageObject.message.stage_name;

    const finishTime = getServerTime();

    const url = 'mongodb://localhost:27017';
    const dbName = 'timetracker';

    (async function mongo() {
      let client;
      try {
        client = await MongoClient.connect(url);
        debug('Connected correctly to server');

        const db = client.db(dbName);

        const response = await db.collection('racer').updateOne({
          starter_number: starterNumber,
          'races.race_id': raceId,
          'races.race_name': raceName,
          'races.stages.stage_id': stageId,
          'races.stages.stage_name': stageName,
        }, {
          $set: {
            'races.stages.stage_results.stage_finish_timestamp_client': timestampClient,
            'races.stages.stage_results.stage_finish_timestamp_server': finishTime,
          },
        });
        // debug(response);
        debug(`DB-Result: ${response.result.ok}`);
      } catch (err) {
        debug(err.stack);
      }

      client.close();
    }());

    debug(`##### getStageResult: ${getStageResult(dataObject)}`);
  }

  return {
    getServerTime,
    storeStartData,
    storeFinishData,
    storeStartDataObject,
  };
}

module.exports = stageService();
