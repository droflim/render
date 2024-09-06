const fs = require('fs');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const socketIO = require('socket.io');
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('wrtc'); // Asegúrate de tener wrtc instalado

const corsOptions = {
    origin: 'https://irc.chateachat.com',
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

app.get('/s/:id', (req, res) => {
    res.sendFile('public/viewer.html', { root: __dirname });
});

const host = 'irc.chateachat.com';
const port = 3000;

server.listen(port, host, () => {
    console.log(`Server started: https://${host}:${port}`);
});

// WebRTC server setup
const peers = {};

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('offer', async (data) => {
        try {
            const peerId = socket.id;
            peers[peerId] = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun.stunprotocol.org' }
                ]
            });

            // Handle incoming SDP offer
            const desc = new RTCSessionDescription(data.sdp);
            await peers[peerId].setRemoteDescription(desc);

            // Create an answer
            const answer = await peers[peerId].createAnswer();
            await peers[peerId].setLocalDescription(answer);

            // Send the answer back to the client
            socket.emit('answer', { sdp: peers[peerId].localDescription });

        } catch (error) {
            console.error('Error handling offer:', error);
        }
    });

    socket.on('candidate', (candidate) => {
        try {
            const peer = peers[candidate.id];
            if (peer) {
                peer.addIceCandidate(new RTCIceCandidate(candidate.candidate));
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        delete peers[socket.id];
    });
});
