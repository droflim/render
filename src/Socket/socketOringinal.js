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
        const handleAddCandidateConsumer = (data) => {
            consumerService.addCandidateFromClient(data);
        };
        
        const handleAddCandidateBroadcast = (data) => {
            broadcastService.addCandidateFromClient(data);
        };
        
        socket.on('add-candidate-consumer', handleAddCandidateConsumer);
        socket.on('add-candidate-broadcast', handleAddCandidateBroadcast);

        // Manejador para cuando un socket se desconecta
        socket.on('disconnect', () => {
            console.log("Socket disconnected: " + socket.id);
            // Limpiar los listeners específicos al desconectar
            socket.off('add-candidate-consumer', handleAddCandidateConsumer);
            socket.off('add-candidate-broadcast', handleAddCandidateBroadcast);
        });
    });
};
