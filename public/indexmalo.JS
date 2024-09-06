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
}

const mediaConstraints = {
    video: true,
    audio: false
}

var broadcast_id;
var localCandidates = [];
var remoteCandidates = [];

var peer;

async function init() {
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    document.getElementById("video").srcObject = stream;
    peer = await createPeer();
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
}

async function createPeer() {
    peer = new RTCPeerConnection(configurationPeerConnection, offerSdpConstraints);
    localCandidates = [];
    remoteCandidates = [];
    iceCandidate();
    peer.onnegotiationneeded = async() => await handleNegotiationNeededEvent(peer);
    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer({ 'offerToReceiveVideo': 1 });
    await peer.setLocalDescription(offer);

    const payload = {
        sdp: peer.localDescription,
        socket_id: socket_id
    };

    console.log("Send socket id: " + socket_id);

    const { data } = await axios.post('/broadcast', payload);
    console.log(data.message);
    const desc = new RTCSessionDescription(data.data.sdp);
//    broadcast_id = data.data.id;
broadcast_id = data.data.id.slice(0, 1);  
  var link = `/s/${broadcast_id}`;
//var link2 =  `/stream/${nick}`; 
//document.getElementById("text-container").innerHTML = `https://irc.chateachat.com:3000${link}?/${nick}`;
document.getElementById("text-container").innerHTML = `https://irc.chateachat.com:3000${link}?nick=${encodeURIComponent(nick)}`;
//document.getElementById("text-container").innerHTML = `https://irc.chateachat.com:3000${link2}`;
//buena document.getElementById("text-container").innerHTML = `https://irc.chateachat.com:3000${link}?${nick}`;
//document.getElementById("text-container").innerHTML = `<button onclick="window.location.href='https://irc.chateachat.com:3000${link}?${nick}'">${nick}</button>`;
//document.getElementById("text-container").innerHTML = `
//  <button onclick="window.open('https://irc.chateachat.com:3000${link}?${nick}', '_blank')">${nick}</button>
//`;

    await peer.setRemoteDescription(desc).catch(e => console.log(e));
    
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

// -----------------------------------------------------------------------------


var socket = io(Config.host + ":" + Config.port);
var socket_id;

socket.on('from-server', function(_socket_id) {
    socket_id = _socket_id;
    console.log("me connected: " + socket_id);
});

socket.on("candidate-from-server", (data) => {
    remoteCandidates.push(data);
});

// Initialize on page load
window.onload = () => {
    init();
};
