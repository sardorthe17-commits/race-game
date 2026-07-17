const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: { origin: "*" } // Har qanday ulanishga ruxsat (Render uchun)
});
const path = require('path');

const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

let rooms = {};

// Mavjud xonalar ro'yxatini hamma o'yinchilarga yuborish
function broadcastRoomList() {
    const roomList = Object.keys(rooms).map(id => ({
        id: id,
        playerCount: Object.keys(rooms[id].players).length,
        isStarted: rooms[id].gameStarted
    }));
    io.emit('roomListUpdate', roomList); // Hamma mijozlarga tarqatish
}

io.on('connection', (socket) => {
    console.log(`Ulandi: ${socket.id}`);
    
    // Kirgan zahoti ro'yxatni yuboramiz
    broadcastRoomList();

    socket.on('joinRoom', (data) => {
        const { roomID, username } = data;
        if (!roomID || !username) return;

        socket.join(roomID);
        socket.currentRoom = roomID; // O'yinchi qaysi xonadaligini eslab qolamiz

        if (!rooms[roomID]) {
            rooms[roomID] = { players: {}, gameStarted: false, laps: 3 };
        }

        const isAdmin = Object.keys(rooms[roomID].players).length === 0;
        rooms[roomID].players[socket.id] = {
            id: socket.id,
            name: username,
            ready: false,
            isAdmin: isAdmin,
            pos: { x: 120, y: 150 + (Object.keys(rooms[roomID].players).length * 60) },
            angle: 0,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            laps: 0
        };

        console.log(`Xonaga qo'shildi: ${username} -> ${roomID}`);
        
        io.to(roomID).emit('roomUpdate', { players: rooms[roomID].players });
        broadcastRoomList(); // Ro'yxatni yangilaymiz (chunki odam qo'shildi)
    });

    socket.on('toggleReady', (roomID) => {
        if (rooms[roomID] && rooms[roomID].players[socket.id]) {
            rooms[roomID].players[socket.id].ready = !rooms[roomID].players[socket.id].ready;
            io.to(roomID).emit('roomUpdate', { players: rooms[roomID].players });
        }
    });

    socket.on('requestStartGame', (data) => {
        const { roomID, laps } = data;
        if (rooms[roomID] && rooms[roomID].players[socket.id]?.isAdmin) {
            rooms[roomID].gameStarted = true;
            rooms[roomID].laps = laps || 3;
            io.to(roomID).emit('startGame', { laps: rooms[roomID].laps, players: rooms[roomID].players });
            broadcastRoomList(); // Ro'yxatda "O'yin ketmoqda" deb chiqishi uchun
        }
    });

    socket.on('playerUpdate', (data) => {
        if (rooms[data.roomID]?.players[socket.id]) {
            rooms[data.roomID].players[socket.id].pos = data.pos;
            rooms[data.roomID].players[socket.id].angle = data.angle;
            socket.to(data.roomID).emit('playerMoved', { id: socket.id, pos: data.pos, angle: data.angle });
        }
    });

    socket.on('chatMsg', (data) => {
        if (rooms[data.roomID]?.players[socket.id]) {
            io.to(data.roomID).emit('newChatMsg', { name: rooms[data.roomID].players[socket.id].name, text: data.text });
        }
    });

    socket.on('disconnect', () => {
        const roomID = socket.currentRoom;
        if (roomID && rooms[roomID]) {
            const wasAdmin = rooms[roomID].players[socket.id]?.isAdmin;
            delete rooms[roomID].players[socket.id];

            if (Object.keys(rooms[roomID].players).length === 0) {
                delete rooms[roomID];
            } else {
                if (wasAdmin) {
                    const firstId = Object.keys(rooms[roomID].players)[0];
                    rooms[roomID].players[firstId].isAdmin = true;
                }
                io.to(roomID).emit('roomUpdate', { players: rooms[roomID].players });
            }
            broadcastRoomList();
        }
        console.log(`Chiqib ketdi: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server: ${PORT}`);
});