const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
require('dotenv').config();
app.use(express.static(path.join(__dirname, '../public')));

let rooms = {};

// Mavjud xonalar ro'yxatini hamma ulanib turganlarga yuborish
function broadcastRoomList() {
    let roomList = Object.keys(rooms).map(id => ({
        id, 
        playerCount: Object.keys(rooms[id].players).length, 
        isStarted: rooms[id].gameStarted
    }));
    io.emit('roomListUpdate', roomList);
}

io.on('connection', (socket) => {
    console.log(`Ulanish: ${socket.id}`);
    broadcastRoomList(); // Kirgan zahoti ro'yxatni ko'radi

    socket.on('joinRoom', (data) => {
        const { roomID, username } = data;
        if (!roomID || !username) return;

        socket.join(roomID);
        if (!rooms[roomID]) rooms[roomID] = { players: {}, gameStarted: false, laps: 3 };
        
        const playerCount = Object.keys(rooms[roomID].players).length;
        const isAdmin = playerCount === 0;

        // Start pozitsiyasi
        const startX = 120;
        const startY = 150 + (playerCount * 60);

        rooms[roomID].players[socket.id] = {
            id: socket.id, name: username, ready: false, isAdmin, 
            pos: { x: startX, y: startY }, angle: 0, 
            color: `hsl(${Math.random() * 360}, 70%, 50%)`, laps: 0
        };

        io.to(roomID).emit('roomUpdate', { players: rooms[roomID].players, laps: rooms[roomID].laps });
        broadcastRoomList();
    });

    socket.on('toggleReady', (roomID) => {
        if (rooms[roomID]?.players[socket.id]) {
            rooms[roomID].players[socket.id].ready = !rooms[roomID].players[socket.id].ready;
            io.to(roomID).emit('roomUpdate', { players: rooms[roomID].players });
        }
    });

    // O'YINNI BOSHLASH VA POZITSIYALARNI RESET QILISH
    socket.on('requestStartGame', (data) => {
        const { roomID, laps } = data;
        const room = rooms[roomID];
        if (room?.players[socket.id]?.isAdmin) {
            room.gameStarted = true;
            room.laps = parseInt(laps) || 3;
            
            // Barcha o'yinchilarni start chizig'iga qaytarish
            const playerIds = Object.keys(room.players);
            playerIds.forEach((id, index) => {
                const p = room.players[id];
                p.pos = { x: 120, y: 150 + (index * 60) };
                p.angle = 0;
                p.laps = 0;
                p.ready = false; // Kelgusi o'yin uchun
            });

            io.to(roomID).emit('startGame', { 
                laps: room.laps, 
                players: room.players // Yangilangan start pozitsiyalari
            });
            broadcastRoomList();
        }
    });

    socket.on('playerUpdate', (data) => {
        if (rooms[data.roomID]?.players[socket.id]) {
            rooms[data.roomID].players[socket.id].pos = data.pos;
            rooms[data.roomID].players[socket.id].angle = data.angle;
            socket.to(data.roomID).emit('playerMoved', { id: socket.id, pos: data.pos, angle: data.angle });
        }
    });

    socket.on('lapCompleted', (data) => {
        const { roomID, laps } = data;
        if (rooms[roomID]?.players[socket.id]) {
            rooms[roomID].players[socket.id].laps = laps;
            if (laps >= rooms[roomID].laps) {
                const winnerName = rooms[roomID].players[socket.id].name;
                rooms[roomID].gameStarted = false;
                io.to(roomID).emit('gameFinished', { winner: winnerName });
                broadcastRoomList();
            }
        }
    });

    socket.on('chatMsg', (data) => {
        if (rooms[data.roomID]?.players[socket.id]) {
            io.to(data.roomID).emit('newChatMsg', { name: rooms[data.roomID].players[socket.id].name, text: data.text });
        }
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(id => {
            if (rooms[id] && rooms[id].players[socket.id]) {
                delete rooms[id].players[socket.id];
                if (Object.keys(rooms[id].players).length === 0) delete rooms[id];
                else io.to(id).emit('roomUpdate', { players: rooms[id].players });
                broadcastRoomList();
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => { 
    console.log(`Server ishlamoqda: ${PORT}`);
});