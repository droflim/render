const fs = require('fs');
const cors = require('cors');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config(); // Load environment variables

// Configuración de CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',  // Use environment variable or allow all origins
    optionsSuccessStatus: 200,
};

const app = express();

// Cambiar a HTTP para desarrollo local
const server = http.createServer(app);
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

const port = process.env.PORT || 4000; // Use PORT environment variable or default to 4000
const host = '0.0.0.0';  // Bind to 0.0.0.0 for external access

server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

require('./src/Route/route')(app);
require('./src/Socket/socketEvent')(io);
require('./src/Socket/socketFunction').init(io);
