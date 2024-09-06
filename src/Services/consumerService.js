const webrtc = require("wrtc");
const { v4: uuidv4 } = require('uuid');
const config = require("../config");
const { broadcasters, consumers } = require("../Data/data");
const socketFunction = require("../Socket/socketFunction");

class Consumer {
    constructor(_id = null, _peer = new webrtc.RTCPeerConnection(), _socket_id = null, broadcast_id = null) {
        this.id = _id;
        this.peer = _peer;
        this.socket_id = _socket_id;
        this.broadcast_id = broadcast_id;
    }
}

async function addConsumer(socket_id, broadcast_id, sdp) {
    var id = uuidv4();
    var consumer = new Consumer(id, new webrtc.RTCPeerConnection(config.configurationPeerConnection, config.offerSdpConstraints), socket_id, broadcast_id);
    
    consumers[id] = consumer;
    
    consumerOnIceCandidate(id);
    consumerConnectionState(id);

    await sdpProcess(id, broadcast_id, sdp);

    return id;
}

async function sdpProcess(id, broadcast_id, sdp) {
    try {
        if (!consumers[id]) {
            throw new Error(`Consumer with id ${id} does not exist.`);
        }

        const broadcaster = broadcasters[broadcast_id];
        if (!broadcaster) {
            console.error(`Error: Broadcaster with id ${broadcast_id} does not exist.`);
            throw new Error(`Broadcaster with id ${broadcast_id} does not exist.`);
        }

        const stream = broadcaster.stream;
        if (!stream) {
            console.error(`Error: Stream for broadcaster ${broadcast_id} is not available.`);
            throw new Error(`Stream for broadcaster ${broadcast_id} is not available.`);
        }

        var desc = new webrtc.RTCSessionDescription(sdp);
        await consumers[id].peer.setRemoteDescription(desc);

        stream.getTracks().forEach(track =>
            consumers[id].peer.addTrack(track, stream)
        );

        const answer = await consumers[id].peer.createAnswer({ 'offerToReceiveVideo': 1 });
        await consumers[id].peer.setLocalDescription(answer);
    } catch (e) {
        console.error(`Error in sdpProcess for consumer ${id}:`, e);
    }
}

function consumerConnectionState(id) {
    if (!consumers[id]) {
        console.error(`Consumer with id ${id} does not exist.`);
        return;
    }

    consumers[id].peer.oniceconnectionstatechange = () => {
        try {
            const connectionStatus = consumers[id].peer.iceConnectionState;
            if (["disconnected", "failed", "closed"].includes(connectionStatus)) {
                console.log("\x1b[31m", "Consumer: " + id + " - " + connectionStatus, "\x1b[0m");
                removeConsumer(id);
            }
            if (["connected"].includes(connectionStatus)) {
                console.log("\x1b[34m", "Consumer: " + id + " - " + connectionStatus, "\x1b[0m");
            }
        } catch (e) {
            console.error(`Error in consumerConnectionState for consumer ${id}:`, e);
        }
    };
}

async function consumerOnIceCandidate(id) {
    if (!consumers[id]) {
        console.error(`Consumer with id ${id} does not exist.`);
        return;
    }

    consumers[id].peer.onicecandidate = (e) => {
        if (e.candidate) {
            const candidate = {
                'candidate': String(e.candidate.candidate),
                'sdpMid': String(e.candidate.sdpMid),
                'sdpMLineIndex': e.candidate.sdpMLineIndex,
            };
            socketFunction.sendCandidateToClient(consumers[id].socket_id, candidate);
        }
    };
}

async function addCandidateFromClient(data) {
    if (consumers[data.id]) {
        try {
            await consumers[data.id].peer.addIceCandidate(new webrtc.RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error(`Error adding ICE candidate to consumer ${data.id}:`, e);
        }
    } else {
        console.error(`Consumer with id ${data.id} does not exist.`);
    }
}

async function removeConsumer(id) {
    if (consumers[id]) {
        console.log("\x1b[31m", "Remove consumer: " + id, "\x1b[0m");
        consumers[id].peer.close();
        delete consumers[id];
    } else {
        console.error(`Consumer with id ${id} does not exist.`);
    }
}

module.exports = {
    addConsumer,
    addCandidateFromClient
};
