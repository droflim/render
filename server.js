const fs = require('fs');
const cors = require('cors');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config(); // Carga las variables de entorno

// Configuración de CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',  // Usa la variable de entorno o permite todos los orígenes
    optionsSuccessStatus: 200,
};

const app = express();

// Configura el servidor HTTP
const server = http.createServer(app);

// Configura socket.io con opciones CORS
const io = socketIO(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',  // Usa la variable de entorno o permite todos los orígenes
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

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

const port = process.env.PORT || 4000; // Usa la variable de entorno PORT o un valor por defecto
const host = 'https://0.0.0.0';  // Vincula a todas las interfaces

server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

require('./src/Route/route')(app);
require('./src/Socket/socketEvent')(io);
require('./src/Socket/socketFunction').init(io);
