const configurationPeerConnection = {
    iceServers: [{
        urls: "stun:stun.l.google.com:19302"
            // urls: "stun:stun.l.google.com:19302?transport=tcp"
    }]
};

const offerSdpConstraints = {
    "mandatory": {
        "OfferToReceiveAudio": true,
        "OfferToReceiveVideo": true,
    },
    "optional": [],
};

const addTransceiverConstraints = { direction: "recvonly" };

window.onload = () => {
    showList();
};

var peer;
var broadcast_id = "";
var consumer_id = "";
var localCandidates = [];
var remoteCandidates = [];

async function watch(e) {
    broadcast_id = e.getAttribute("data");
    await createPeer();
    document.getElementById("text-container").innerHTML = "Streaming on id:" + broadcast_id;
}

async function showList() {
    try {
        const data = await axios.get("/list-broadcast");

        // Only show the latest broadcast ID button
        if (data.data.length > 0) {
            const latestBroadcastId = data.data[data.data.length - 1];
            const html = `
                <ul style="list-style-type: none;">
                    <li style="margin-top:4px;">
                        <button data='${latestBroadcastId}' id='view-${latestBroadcastId}'
                        onClick="watch(this)">
                        Watch ${latestBroadcastId}
                        </button>
                    </li>
                </ul>
            `;
            document.getElementById('list-container').innerHTML = html;
        } else {
            // Handle the case where there are no broadcasts
            document.getElementById('list-container').innerHTML = '<p>No broadcasts available</p>';
        }
    } catch (error) {
        console.error('Error fetching broadcast list:', error);
    }
}

async function createPeer() {
    localCandidates = [];
    remoteCandidates = [];
    if (peer != null && peer != undefined) {
        return handleNegotiationNeededEvent(peer);
    }

    peer = new RTCPeerConnection(configurationPeerConnection, offerSdpConstraints);

    peer.addTransceiver("video", addTransceiverConstraints);
    peer.addTransceiver("audio", addTransceiverConstraints);

    peer.ontrack = handleTrackEvent;

    iceCandidate();

    peer.onnegotiationneeded = async () => await handleNegotiationNeededEvent(peer);

    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer({ 'offerToReceiveVideo': 1 });
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription,
        broadcast_id: broadcast_id,
        socket_id: socket_id
    };
    const { data } = await axios.post('/consumer', payload);
    console.log(data.message);
    consumer_id = data.data.id;

    const desc = new RTCSessionDescription(data.data.sdp);
    await peer.setRemoteDescription(desc).catch(e => console.log(e));

    // Send local candidate to server
    localCandidates.forEach((e) => {
        socket.emit("add-candidate-consumer", {
            id: consumer_id,
            candidate: e
        });
    });

    // Add remote candidate to local
    remoteCandidates.forEach((e) => {
        peer.addIceCandidate(new RTCIceCandidate(e));
    });
}

function handleTrackEvent(e) {
    console.log(e.streams[0]);
    document.getElementById("video").srcObject = e.streams[0];
}

function iceCandidate() {
    peer.onicecandidate = (e) => {
        if (!e || !e.candidate) return;
        var candidate = {
            'candidate': String(e.candidate.candidate),
            'sdpMid': String(e.candidate.sdpMid),
            'sdpMLineIndex': e.candidate.sdpMLineIndex,
        };
        localCandidates.push(candidate);
    };

    peer.onconnectionstatechange = (e) => {
        console.log("status");
        console.log(e);
    };

    peer.onicecandidateerror = (e) => {
        console.log("error1");
        console.log(e);
    };

    peer.oniceconnectionstatechange = (e) => {
        try {
            const connectionStatus = peer.connectionState;
            if (["disconnected", "failed", "closed"].includes(connectionStatus)) {
                console.log("disconnected");
            } else {
                console.log("connected");
            }
        } catch (e) {
            console.log(e);
        }
    };
}

var socket = io(Config.host + ":" + Config.port);
var socket_id;

socket.on('from-server', function(_socket_id) {
    socket_id = _socket_id;
    console.log("me connected: " + socket_id);
});

socket.on("candidate-from-server", (data) => {
    remoteCandidates.push(data);
});
