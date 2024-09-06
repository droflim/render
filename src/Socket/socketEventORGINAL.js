const broadcastService = require("../Services/broadcastServices");
const consumerService = require("../Services/consumerService");

module.exports = (io) => {
    io.on('connection', async (socket) => {
        console.log("New connection: " + socket.id);

        // Emitir el ID del socket al cliente conectado
        socket.emit("from-server", socket.id);

        // Unir el socket a la sala "lobby"
        socket.join('lobby');

        // Emitir un mensaje al cliente indicando que se ha unido a la sala
        socket.emit('joined-lobby', 'You have joined the lobby room');
        
        // Escuchar eventos específicos del cliente
        socket.on('add-candidate-consumer', (data) => {
            consumerService.addCandidateFromClient(data);
        });
        
        socket.on('add-candidate-broadcast', (data) => {
            broadcastService.addCandidateFromClient(data);
        });

        // Manejador para cuando un socket se desconecta
        socket.on('disconnect', () => {
            console.log("Socket disconnected: " + socket.id);
        });
    });
}
