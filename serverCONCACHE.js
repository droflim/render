const fs = require('fs');
 const cors = require('cors');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const socketIO = require('socket.io');


const corsOptions = {
   origin: 'https://irc.chateachat.com',//(https://your-client-app.com)
   optionsSuccessStatus: 200,
 };

 
const app = express();


const privateKey = fs.readFileSync('/etc/letsencrypt/live/irc.chateachat.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/irc.chateachat.com/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };


const server = https.createServer(credentials, app);


const io = socketIO(server);

app.use(cors(corsOptions));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/s', (req, res) => {
    res.sendFile('public/index.html', { root: __dirname });
});

app.get("/s/:id",(req,res)=>{
    res.sendFile('public/viewer.html', {root: __dirname })
})



const host = 'irc.chateachat.com';
const port = 3000;

server.listen(port, host, () => {
    console.log(`Server started: https://${host}:${port}`);
});

require('./src/Route/route')(app);
require('./src/Socket/socketEvent')(io);
require('./src/Socket/socketFunction').init(io);
