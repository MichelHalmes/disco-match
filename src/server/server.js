const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');


const SONG_FOLDER = path.join(__dirname, '../../songs');

const app = express();

app.set('port', (process.env.PORT || 4000));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// GET SONG NAME ++++++++++++++++++++++++++++++++++++

const SONGS = fs.readdirSync(SONG_FOLDER)
              .filter((fn) => fn.endsWith('.mp3'))
              .map((fn) => fn.slice(0, fn.length - 4));
              


// SETUP WORK DB ++++++++++++++++++++++++++++++++++++
const loki = require('lokijs');
let DB = new loki('./loki.json');

let SA = DB.addCollection('SongAllocations', {unique: ['code', 'username']});
let LOG = DB.addCollection('Logs');
let USR = DB.addCollection('Users', {unique: ['username']});



// REST API ++++++++++++++++++++++++++++++++++++

app.post('/api/login', (req, res) => {
  let username = req.body.username;
  let email = req.body.email;
  console.log('/api/login', username, email);

  let existingUser = USR.findOne({username});
  if (existingUser) {
    console.log('/api/login', 'Already exists!');
    res.status(403).send('A user with this username exists already!');
  } else {
    USR.insert({username, email});
    console.log('/api/login', 'OK!')
    res.json({});
  }
});


// REST API ++++++++++++++++++++++++++++++++++++
let nextCode = 1;
let nextSongIdx = 0;
const MIN_PROBA_MATCH = 0.1;

USR.insert({username: 'michel', email: ''});
LOG.insert({username: 'michel', songIdx: '0'});
LOG.insert({username: 'michel', songIdx: '1'});
SA.insert({code: '0000', songIdx: 0, username: 'a'});
SA.insert({code: '0001', songIdx: 0, username: 'b'});
SA.insert({code: '0002', songIdx: 1, username: 'c'});

nextCode = 3;
nextSongIdx = 2;


app.get('/api/code', (req, res) => {
  console.log('/api/code');
  let username = Buffer.from(req.headers.authorization, 'base64').toString();
  console.log('code for: ' + username)

  let code = nextCode;
  nextCode = (nextCode+1) % 10000;
  code = '000' + code.toString();
  code = code.slice(-4);

  let songsPlayed = SA.find({}).map((sa) => sa.songIdx);
  let songCounts = {};
  songsPlayed.forEach(function (songIdx) {
    songCounts[songIdx] = songCounts[songIdx] ? songCounts[songIdx]+1 : 1;
  });
  let songIdxBest; 
  Object.keys(songsPlayed).forEach(function (songIdx) {
    if ((songIdxBest == undefined || songCounts[songIdx] > songCounts[songIdxBest]) && LOG.findOne({username, songIdx}) == undefined) {
      songIdxBest = songIdx;
    }
  });

  let nbPlayers = songsPlayed.length;
  if (songIdxBest == undefined) {
    songIdxBest = nextSongIdx;
    nextSongIdx = (nextSongIdx + 1) % SONGS.length; 
  } else if (nbPlayers != 1 && (songCounts[songIdxBest]-1) / (nbPlayers - 1) > MIN_PROBA_MATCH) {
    songIdxBest = nextSongIdx;
    nextSongIdx = (nextSongIdx + 1) % SONGS.length; 
  }


  let song = SONGS[songIdxBest]
  
  SA.insert({code, song, username});
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); 
  res.json(code);
});


// REST API ++++++++++++++++++++++++++++++++++++

app.get('/api/song/:code', (req, res) => {
  let code = req.params.code;
  let allocation = SA.findOne({code});

  if (allocation) {
    let songFile = allocation.song + '.mp3';
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); 
    res.sendFile(path.join(SONG_FOLDER, songFile));
  } else {
    res.status(404).send('The requested code does not correspond to any song!');
  }

});



app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`); // eslint-disable-line no-console
});
