const nick = prompt("Ingresa tu nick normalmente");
if (!nick) {
    alert("Debes ingresar un nick para continuar.");
    throw new Error("Nick no proporcionado.");
}

const configurationPeerConnection = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.stunprotocol.org" }
    ]
};

const offerSdpConstraints = {
    "mandatory": {
        "OfferToReceiveAudio": true,
        "OfferToReceiveVideo": true,
    },
    "optional": [],
};

const mediaConstraints = {
    video: true,
    audio: true  // Habilitar el audio aquí
};

var broadcast_id;
var localCandidates = [];
var remoteCandidates = [];
var peer;

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        document.getElementById("video").srcObject = stream;
        peer = await createPeer();
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
    } catch (error) {
        console.error(error);
    }
}

async function createPeer() {
    peer = new RTCPeerConnection(configurationPeerConnection, offerSdpConstraints);
    localCandidates = [];
    remoteCandidates = [];
    iceCandidate();
    peer.onnegotiationneeded = async () => await handleNegotiationNeededEvent(peer);
    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    try {
        const offer = await peer.createOffer({ 'offerToReceiveVideo': 1, 'offerToReceiveAudio': 1 }); // Asegúrate de que también reciba audio
        await peer.setLocalDescription(offer);

        const payload = {
            sdp: peer.localDescription,
            socket_id: socket_id
        };

        const { data } = await axios.post('/broadcast', payload);
        broadcast_id = data.data.id;

        localStorage.setItem('broadcast_id', broadcast_id);

        const viewUrl = `https://0.0.0.0:4000/viewer.html?broadcast_id=${broadcast_id}&nick=${encodeURIComponent(nick)}`;
        document.getElementById("text-container").innerHTML = `
            <a href="${viewUrl}" target="_blank">${viewUrl}</a>
        `;

        await peer.setRemoteDescription(new RTCSessionDescription(data.data.sdp)).catch(e => console.log(e));

        localCandidates.forEach((e) => {
            socket.emit("add-candidate-broadcast", {
                id: broadcast_id,
                candidate: e
            });
        });

        remoteCandidates.forEach((e) => {
            peer.addIceCandidate(new RTCIceCandidate(e));
        });
    } catch (error) {
        console.error(error);
    }
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
        console.log("Connection state changed:", peer.connectionState);
    };

    peer.onicecandidateerror = (e) => {
        console.error("ICE candidate error:", e);
    };

    peer.oniceconnectionstatechange = (e) => {
        try {
            const connectionStatus = peer.connectionState;
            if (["disconnected", "failed", "closed"].includes(connectionStatus)) {
                console.warn("Connection state:", connectionStatus);
            } else {
                console.log("Connection state:", connectionStatus);
            }
        } catch (e) {
            console.error("ICE connection state change error:", e);
        }
    };
}

var socket = io(Config.host + ":" + Config.port);
var socket_id;

socket.on('from-server', function(_socket_id) {
    socket_id = _socket_id;
});

socket.on("candidate-from-server", (data) => {
    remoteCandidates.push(data);
});

window.onload = () => {
    init();
};
