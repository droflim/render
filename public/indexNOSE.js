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

const mediaConstraints = {
    video: true,
    audio: false
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
        console.error("Error initializing media:", error);
    }
}

async function createPeer() {
    peer = new RTCPeerConnection(configurationPeerConnection);
    localCandidates = [];
    remoteCandidates = [];
    iceCandidate();
    peer.onnegotiationneeded = async () => await handleNegotiationNeededEvent(peer);
    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        const payload = {
            sdp: peer.localDescription,
            socket_id: socket_id
        };

        const { data } = await axios.post('/api/broadcast', payload);
        broadcast_id = data.data.id;

        // Construye la URL única para ver el stream
        const viewUrl = `https://irc.chateachat.com:3000/s/viewer.html?broadcast_id=${broadcast_id}&nick=${encodeURIComponent(nick)}`;
        document.getElementById("text-container").innerHTML = `
            <a href="${viewUrl}" target="_blank">${viewUrl}</a>
        `;

        await peer.setRemoteDescription(new RTCSessionDescription(data.data.sdp)).catch(e => console.log(e));

        // Enviar candidatos ICE locales al servidor
        localCandidates.forEach((e) => {
            socket.emit("add-candidate-broadcast", {
                id: broadcast_id,
                candidate: e
            });
        });

        // Agregar candidatos ICE remotos al peer
        remoteCandidates.forEach((e) => {
            peer.addIceCandidate(new RTCIceCandidate(e));
        });
    } catch (error) {
        console.error("Error handling negotiation needed event:", error);
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
        // Handle connection state changes if needed
    };

    peer.onicecandidateerror = (e) => {
        // Handle ICE candidate errors if needed
    };

    peer.oniceconnectionstatechange = (e) => {
        try {
            const connectionStatus = peer.connectionState;
            if (["disconnected", "failed", "closed"].includes(connectionStatus)) {
                // Handle disconnection
            } else {
                // Handle connection status updates
            }
        } catch (e) {
            console.error("Error handling ICE connection state change:", e);
        }
    };
}

// Establecer conexión con el servidor
var socket = io('https://irc.chateachat.com:3000');
var socket_id;

socket.on('from-server', function(_socket_id) {
    socket_id = _socket_id;
});

socket.on("candidate-from-server", (data) => {
    remoteCandidates.push(data);
});

// Inicializar en la carga de la página
window.onload = () => {
    init();
};
