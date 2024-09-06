const nick = prompt("Ingresa tu nick MAXIMO DE 5 LETRAS O SU CAM NO SE VERA EN LA LISTA DE USUARIOS");
if (!nick) {
    alert("Debes ingresar un nick para continuar.");
    throw new Error("Nick no proporcionado.");
}

// En el lado del cliente
if (nick.length > 5) {
    alert("El nick debe tener un máximo de 5 caracteres.");
    throw new Error("Nick demasiado largo.");
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
    audio: false
};

var broadcast_id;
var localCandidates = [];
var remoteCandidates = [];
var peer;

function generateShortId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

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
    peer = new RTCPeerConnection(configurationPeerConnection, offerSdpConstraints);
    localCandidates = [];
    remoteCandidates = [];
    iceCandidate();
    peer.onnegotiationneeded = async () => await handleNegotiationNeededEvent(peer);
    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    try {
        const offer = await peer.createOffer({ 'offerToReceiveVideo': 1 });
        await peer.setLocalDescription(offer);

        const payload = {
            sdp: peer.localDescription,
            socket_id: socket_id
        };

        const { data } = await axios.post('/broadcast', payload);
        
        // Genera un ID corto de 3 caracteres
        broadcast_id = generateShortId(3);

        // Guarda el broadcast_id en localStorage
        localStorage.setItem('broadcast_id', broadcast_id);

        // Construye la URL única para ver el stream
        const viewUrl = `https://irc.chateachat.com:3000/viewer.html?broadcast_id=${broadcast_id}&nick=${encodeURIComponent(nick)}`;
        document.getElementById("text-container").innerHTML = `
            <a href="${viewUrl}" target="_blank">Watch ${nick}</a>
        `;

        await peer.setRemoteDescription(new RTCSessionDescription(data.data.sdp)).catch(e => console.log(e));

        // Add local candidate to server
        localCandidates.forEach((e) => {
            socket.emit("add-candidate-broadcast", {
                id: broadcast_id,
                candidate: e
            });
        });

        // Add remote candidate to local
        remoteCandidates.forEach((e) => {
            peer.addIceCandidate(new RTCIceCandidate(e));
        });
    } catch (error) {
        console.error("Error during negotiation:", error);
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
                console.log("Connection disconnected");
            } else {
                console.log("Connection connected");
            }
        } catch (e) {
            console.error(e);
        }
    };
}

// Establecer conexión con el servidor
var socket = io(Config.host + ":" + Config.port);
var socket_id;

socket.on('from-server', function(_socket_id) {
    socket_id = _socket_id;
    console.log("Connected with socket ID:", socket_id);
});

socket.on("candidate-from-server", (data) => {
    remoteCandidates.push(data);
});

// Inicializar en la carga de la página
window.onload = () => {
    init();
};
