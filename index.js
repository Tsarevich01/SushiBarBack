const express = require('express');
const bodyParser = require('body-parser');
const dropboxV2api = require('dropbox-v2-api');
const dropboxConfig = require ('./dropbox');
const cors = require('cors');

const app = express();

let db = require('./db');
db.connect();
  

const port = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ 
  extended: true,
  limit: '50mb'
}));

require('./node_routes')(app, db);

if (dropboxConfig.access_token) {
  global.dropbox = dropboxV2api.authenticate({
    token: dropboxConfig.access_token
  });
} else {
  global.dropbox = dropboxV2api.authenticate({
    client_id: dropboxConfig.client_id,
    client_secret: dropboxConfig.client_secret,
    redirect_uri: dropboxConfig.redirect_uri
  });
}

app.listen(port, () => {
  console.log('We are live on ' + port);
});