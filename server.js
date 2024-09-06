const fs = require('fs');
const cors = require('cors');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const socketIO = require('socket.io');

// Configuración de CORS
const corsOptions = {
   origin: 'https://irc.chateachat.com',
   optionsSuccessStatus: 200,
};

const app = express();

// Configuración de HTTPS
const privateKey = fs.readFileSync('/etc/letsencrypt/live/irc.chateachat.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/irc.chateachat.com/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Crear servidor HTTPS
const server = https.createServer(credentials, app);
const io = socketIO(server);

// Middleware para prevenir caché
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(cors(corsOptions));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/s', (req, res) => {
    res.sendFile('public/index.html', { root: __dirname });
});

app.get("/s/:id", (req, res) => {
    res.sendFile('public/viewer.html', { root: __dirname });
});

const host = 'irc.chateachat.com';
const port = 3000;

server.listen(port, host, () => {
  
});

require('./src/Route/route')(app);
require('./src/Socket/socketEvent')(io);
require('./src/Socket/socketFunction').init(io);
