module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('a user connected:', socket.id);

        // Enviar el ID del socket al cliente
        socket.emit('from-server', socket.id);

        // Manejar la oferta de un cliente
        socket.on('offer', (data) => {
            socket.broadcast.emit('offer', data);
        });

        // Manejar la respuesta de un cliente
        socket.on('answer', (data) => {
            socket.broadcast.emit('answer', data);
        });

        // Manejar los candidatos ICE de un cliente
        socket.on('candidate', (data) => {
            socket.broadcast.emit('candidate', data);
        });

        // Manejar la desconexión de un cliente
        socket.on('disconnect', () => {
            console.log('user disconnected:', socket.id);
        });
    });
};
