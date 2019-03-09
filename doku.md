# Code template preparation

prepare package.json
prepare app.json

npm install eslint + eslint-plugin-import + eslint-config-airbnb
npm install express
npm install chalk
npm install debug
npm install morgan
npm install nodemon
npm install bootstrap
npm install jquery
npm install path
mpm install ejs

setting up the application: app.use/app.set ...
    -> declare folders to be used for css,js,views, templating engine ejs


grabbing a template from https://www.bootstrapzero.com/

creating an index.ejs -> struggling with local sources for css/js, bootstrap, jquery
    -> linking to starter and finisher pages

grabbing a new css template from getbootstrap.com -> https://getbootstrap.com/docs/4.1/examples/cover/# 

# 27.12.2018 @ Cafe Continental

Add form to starter.ejs to get starter number
Add route /started to process the given input data
=> add body-parser requirement
=> without you get an error like: javascript Cannot destructure property 'starterNumber' etc...

# 28.12.2018 @ Cafe Europa

Add stageController to ousource DB-functions from stageRoutes and for better testability
function middlewarwe in stageController implemented as raw stub -> preparation for later login-mimik

Add mongodb: npm install mongodb --save
added data-input into mongodb -> its amaizing to see how easy to use it is. Just say what you want - done :-) (No need to create a db or a table or ID fields)

Add stageService to implement testable services for socketio and getServerTime
Implemented getServerTime in a first version

# 04.01.2019 @ SLUB Dresden

Little explaination about mongodb usage

1. Start mongodb-deamon: trojaner@:~/sudo service mongod start
2. use mongo client to check function: trojaner@:~/mongo
3. show databases: >show dbs
4. select database: > use timetracker
5. show collections: > show collections
6. list entrys of collection "racer": > db.racer.find().pretty()

Little explaination how to add a new route - in this case for the application part "monitor"

-- Purpose of the page monitor is to track and show all events flowing around between clients (browser) and server

1. create monitor.ejs under folder views/
    copy code of starter.ejs into it.

2. add navigation link in app.js:
    const nav = [
    { link: '/', title: 'Home' },
    { link: '/stages/starter', title: 'Starter' },
    { link: '/stages/finisher', title: 'Finisher' },
    { link: '/stages/monitor', title: 'Monitor' }, // <-- this entry
    ];

3. add route in stageRoute.js
    ...
    .stageRouter.route('/monitor')
        .get(monitor); // <- must be implemented in stageController

    add field for return-function monitor in initialization of class stageController:

    const { starter, started, finisher, monitor, middleware } = stageController(stageService, nav);

4. add and return function monitor in stageController.js:
   ...
   function monitor(req, res) {
        res.render('monitor', {
        nav,
        title: 'Monitor',
        active: false,
        });
    }
    ...
     return {
    starter,
    started,
    finisher,
    monitor,
    middleware,
  };

First try with socket.io

1. npm install http

// add socket.io
const server = require('http').createServer(app);
const io = require('socket.io')(server);

change start of the server in app.js!!! otherwise the socket.server will not be recognized by the clients
(was difficult to figure it out)

from app.listen(port, () => { ...
to server.listen(port, () => { ...

add function io.on... in app.js

io.on('connection', (client) => {
  debug('Client connected...');
});

add socket.io on client-side in monitor.ejs

<script src="/js/socket.io.js"></script>
    <script>
        var socket = io.connect('http://localhost:8080');
        socket.on('connect', function(data) {
            socket.emit('join', 'Hello World from client');
        });
    </script>
   
# 06.01.2019 @ SLUB Dresden, Started: 11:00 - Finished:

Plan for the session

a) Try to structure the app so that socket-io is handeld by stageController
b) Every race start triggers a event to be published and shown on monitor page
c) rework stageController and starter.ejs to act event-based

1. Make object io available in stageController
   -> change in app.js: const stageRouter = require('./src/routes/stageRoutes')(nav, io);
   -> change in stageRouters.js: function router(nav, io) {
                                 const { starter, started, finisher, monitor, middleware } = stageController(stageService, nav, io);

    -> try it with: function stageController(stageService, nav, io) {

        // TODO: bring this socket.io mechanism to stageController & stageService

        io.on('connection', (client) => {
            debug('Client connected...');

            client.on('join', (data) => {
            debug(data);
            });
        });

    => working

2. added logic into starter.ejs to change the sending by form-post to event-based:

    $('#starterForm').submit(function(e){
            e.preventDefault();
            
            var starterNumber = $('#starterNumber').val();
            var message   = '{"message": {' +
                                '"message_type": "started",' +
                                '"message_text": "' + starterNumber + '"' + 
                              '}' +
                            '}';

            console.log(message);

            socket.emit('messages', message);

2.1. during this I defined the first protocol version for exchanging events between the components. First hands on with JSON.

3. added logic in stageController to broadcast all messages

     client.on('messages', (data) => {
      debug(data);
      client.emit('broad', data); -> to the originator, can be deleted
      client.broadcast.emit('broad', data); -> to all other listeners
    });

4. added logic in monitor.ejs to catch the messages, extract the JSON data and append the message to the message list

     <div id="messages"></div>

     ....

    socket.on('broad', function(data) {

            console.log(data);

            var message = JSON.parse(data);

            console.log(message);

            $('#messages').append(message.message.message_text + "&nbsp;" + message.message.message_type + "<br/>");
        });


# 22./23.01.2019 @ Airplane to Doha & to Kuala Lumpur

Goals for this session: 

1) implement datainsert into mongodb triggered by event
2) implement event panel on starter.ejs
3) implement/reuse panel on finisher.ejs
4) implement stop-functioanlity on finisher.ejs -> update record in mongodb

1.1) create a function in stageService.js to handle all the database stuff -> will help to separate the db stuff from controller and opens the option for better testing and changing the DB (e.g. to GUN-DB if desired)

    function storeStartData(starterNumber) {

    const date = getServerTime();

    const racer = {
      starterNumber,
      startTime: date,
    };

    ... mongo-db insterOne

  }

  return {
    getServerTime,
    storeStartData, --> add the function in the return part 
  };
}

1.2) extend event-handling in stageController.js

     client.on('messages', (data) => {
      debug(data);
      client.emit('broad', data);
      client.broadcast.emit('broad', data);

      // handle input messages

      const messageObject = JSON.parse(data);
      const messageType = messageObject.message.message_type;
      const messageText = messageObject.message.message_text;

      debug(`messageType: ${messageType}`);

      // call stageService to perist the data
      if (messageType === 'started') {
        stageService.storeStartData(messageText); --> call the stageService for inserting the data
      } else if (messageType === 'finished') {

      }
    });

2.1) added message box in starter.ejs and update the box with events on the channel 'broad'

        <p class="lead">
          <h3>Messages</h3>
          <div id="messageBox">
          </div>
        </p>

        ...

         socket.on('broad', function(data) {

            console.log(data);

            var message = JSON.parse(data);

            console.log(message);

            $('#messageBox').append(message.message.message_text + "&nbsp;" + message.message.message_type + "<br/>");
        });

3) Update finisher.ejs, just copied from starter.ejs

4.1) Implement function "storeFinishData" in stageService

    ...
    const response = await db.collection('racer').updateOne({ starterNumber }, { $set: { finishTime } });
    //attention: starterNumber and finishTime are set before and here writte in object-shorthand style 
    //instead of>> starterNumber: starterNumber just starterNumber 
    ...

    update return fields accordingly

4.2) Update stageController.js for calling the storeFinishData function:

    ...
     else if (messageType === 'finished') {
        stageService.storeFinishData(messageText);
      }
    ...

4.3) Update finisher.ejs with a form for input starterNumber

    <form name="finisherForm" id="finisherForm" action="/stages/finished" method="post">
                Starter-Number: <input name="starterNumber" id="starterNumber"/><br/>
                <!-- input id="button" type="submit" name="button" onclick="myFunction();" value="enter"/ -->
                <input type="submit" value="-- FINISH --" />
              </form>

    ...
      $('#finisherForm').submit(function(e){
            e.preventDefault();
            
            var starterNumber = $('#starterNumber').val();
            var message   = '{"message": {' +
                                '"message_type": "finished",' +
                                '"message_text": "' + starterNumber + '"' + 
                              '}' +
                            '}';

        console.log(message);

        socket.emit('messages', message);

4.4) add box into finisher.ejs for trigger the finishtime by button per starter

    -> //TODO: identifie the input button clicked, extract the value, compile the message and post it


TODO:
add stages!
    -> define mongodb collection structure
    -> add stages on starter & finisher-pages, create stage-setup-page?


# 01.02.2019 @ Airplane from KL to Doha

Goals for this session: 

1) introduce stages to mongo-db structure
2) introduce finish-buttons on finisher.js


1) Structure of document in mongo-db

    pseudo-code:

        race:
            race-id: 1
            race-name: myrace

        => more knowledge about structuring documents and relations in a nosql-db required!

1.1) Add stage-field to JSON-message-format send by clients

     var message   = '{"message": {' +
                                '"command": "started",' +
                                '"starter_number": "' + starterNumber + '",' + 
                                '"timestamp_client": "' + new Date() + '",' + 
                                '"race_id": "1",' + 
                                '"race_name": "MADEAST2019",' + 
                                '"stage_id": "1",' + 
                                '"stage_name": "Hexenfelsen"' + 
                              '}' +
                            '}';

    -> externalized messageDataObject to be handeled completly by the service stageService.js (testability, exchange of db layer)

        introduced new function in stageService.js

        function storeStartDataObject(dataObject) {
            ...}

        => But: 1. unclear what is best practice: store the whole JSON-object in the DB
                2. how to select than the right element out the the db when finished is performed (searching in mongo-db)

    2.1) learnde how to travers a event emmitted by a button-click in JavaScript

         $('#finisherFormTabular').submit(function(e){
          e.preventDefault();

          console.log(e); --> inspect this in your browsers javascript console
          console.log(e.currentTarget[0].attributes[2].nodeValue); --> nodevalue

          ...

          ==> but helps not for several buttons of one type

          finally after some studies I introduced a new div-layer "runningBox" where input-buttons are added when new started-events are flowing in.

             <div id="runningBox">
          </div>

          ...

          if(messageCommand==='started'){
              console.log("command started detected.");

              // Finding total number of finisher-buttons added
              var finisherCount = $(".finisher").length;

              console.log("finisherCount: " + finisherCount);

              if(finisherCount>0){
                // last <div> with element class id
                var lastid = $(".finisher:last").attr("id");
                var split_id = lastid.split("_");
                var nextindex = Number(split_id[1]) + 1;
              }
              else{
                var nextindex = 0;
              }

              $('#runningBox').append(`<input type='button' class='finisher' id='btn_${nextindex}' value='${starterNumber}'/><br />`)
            }

          these button-clicks are catched by a new function, the values are read out and sent over the channel. Very simple - you just need to know how :-)

          $('#runningBox').on('click','.finisher', function(){

            var starterNumber = this.value;

            console.log("btn clicked [" + starterNumber + "]");

            var message   = '{...}';

            console.log(message);

            socket.emit('messages', message);

            var id = this.id;
            var split_id = id.split("_");
            var deleteindex = split_id[1];

            // Remove <input-button> with id
            $("#btn_" + deleteindex).remove();

        });

# 13.02.2019 Treffen @ Slub mit Markus

Diskussion Fehlerfälle:
    1) Im Ziel Startnummer vertauscht von zwei finishern
    2) Im Ziel Startnummer falsch ausgewählt - Starter noch unterwegs

    Ansatz: 
        Panel mit Anzeige der letzen 5 Starter im Ziel und Option zur Bearbeitung
        Logik zum vertauschen von Startnummern einbauen: wenn zuerst im Panel geklickt dann vertausche mit der als nächstes gedrückten Nummer im Starter-Panel
        -> Bearbeitung muss durch extra Button angezeigt werden

Features: Panikbutton zum Stoppen der Startabfolge

# 20.02.2019 Treffen @ Slub mit Markus

Goal for this session: learn how to handle & update mongo-db documents
    -> paste finish time into the right part of the json-document

    Easy: just tell the $set operator where to locate the to be updated element

        e.g. updateOne({ starter_number: starterNumber, 'races.stages.stage_name': 'Hexenfelsen' }, { $set: { 'races.stages.stage_results.stage_finish_timestamp_server': finishTime } }); reflects to 

        "_id" : ObjectId("5c6d9de368ea8a1dfe53829e"),
	    "starter_number" : "000016",
	    "races" : {
		    "race_id" : "1",
		    "race_name" : "MADEAST2019",
		    "stages" : {
                "stage_id" : "1",
                "stage_name" : "Hexenfelsen",
                "stage_results" : {
                    "stage_start_timestamp_client" : "Wed Feb 20 2019 19:35:15 GMT+0100 (Mitteleuropäische Normalzeit)",
                    "stage_start_timestamp_server" : ISODate("2019-02-20T18:35:15.703Z"),
                    "stage_finish_timestamp_server" : ISODate("2019-02-20T18:35:20.371Z")
                }
		    }
	    }

    => this makes clear: due to the necessary filtering for updating a special field in a special document I need to give the whole JSON-Data-Object to the update-function!

    Done!

        Update function storeFinishData from handling just a string input "starterNumber" to handling the whole JSON-Object

        function storeFinishData(dataObject) {
        // search starterNumber in DB and update the record

        const messageObject = JSON.parse(dataObject);
        const starterNumber = messageObject.message.starter_number;
        const timestampClient = messageObject.message.timestamp_client;
        const raceId = messageObject.message.race_id;
        const raceName = messageObject.message.race_name;
        const stageId = messageObject.message.stage_id;
        const stageName = messageObject.message.stage_name;

        ...

        const response = await db.collection('racer').updateOne({ starter_number: starterNumber, 'races.race_id': raceId, 'races.race_name': raceName, 'races.stages.stage_id': stageId, 'races.stages.stage_name': stageName }, { $set: { 'races.stages.stage_results.stage_finish_timestamp_client': timestampClient, 'races.stages.stage_results.stage_finish_timestamp_server': finishTime } });

        Update stageController to use this function:

         //stageService.storeFinishData(starterNumber);
        stageService.storeFinishData(data);

# 27.02.2019 @ Slub

Todo: 
    - convert all timestamps into unix timestamps, calculate time difference and send it to monitor
    - Learn how to link documents in mongo-db together, e.g. race-collection with racer collection
    - decide how to move on with mongo-db -> keep it or replace it.


1.1) convert all timestamps into unix timestamps

    Solution: simply put Date.parse(new Date()); whenever you like to get the unix timestamp in millis

1.2) calculate the difference

    calculation is not an issue but; how to handle asynchronous function to get the results back???


# 09.03.2019 @ Home

Setting up a version control using git and connecting to remote repository

git init -> creates a local git repo

Creating a remote git repo on github.com called RaceControl

Adding the remote repo to the local git configuration

>> git remote rc https://github.com/kopfan/RaceControl

--> rc ist the short name for the remote repository (RaceControl)

Try to connect the local and the remote repo caused issue due to unrelated histories.

>> git push rc master -> not successful as there are files on the remote repo (LICENSE)

Try to merge the repos

>> git pull rc master -> not successful due to unrelated histories

Force the merge via

>> git pull rc master --allow-unrelated-histories -> success

Push the local files to the remote repo:

>> git push rc master -> success




