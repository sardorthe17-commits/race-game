import { Car } from './Car.js';
import { InputHandler } from './Input.js';
import { Track } from './Track.js';

const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const input = new InputHandler();
let track = null;

let currentRoom = null;
let myCar = null;
let otherCars = {};
let isGameRunning = false;
let totalLapsRequired = 3;

// UI Elements
const startScreen = document.getElementById('start-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const winnerScreen = document.getElementById('winner-screen');
const gameHud = document.getElementById('game-hud');
const playersWrapper = document.getElementById('players-wrapper');
const msgDiv = document.getElementById('messages');
const roomListDiv = document.getElementById('active-rooms-list');
const chatInput = document.getElementById('chat-input');

// --- ROOM BROWSER (Xonalar ro'yxati) ---
socket.on('roomListUpdate', (roomList) => {
    roomListDiv.innerHTML = "";
    if (roomList.length === 0) {
        roomListDiv.innerHTML = "<p style='color:#777'>Xonalar yo'q...</p>";
        return;
    }
    roomList.forEach(room => {
        const div = document.createElement('div');
        div.style = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #444; align-items:center;";
        const status = room.isStarted ? "<span style='color:red'>O'yin ketmoqda</span>" : "<span style='color:cyan'>Kutilmoqda</span>";
        div.innerHTML = `<span><b>${room.id}</b> (${room.playerCount} o'yinchi)</span> ${status} 
                         <button onclick="joinSpecificRoom('${room.id}')" ${room.isStarted ? 'disabled' : ''}>KIRISH</button>`;
        roomListDiv.appendChild(div);
    });
});

window.joinSpecificRoom = (roomID) => {
    const u = document.getElementById('username').value.trim();
    if (!u) return alert("Avval ismingizni yozing!");
    currentRoom = roomID;
    socket.emit('joinRoom', { roomID: roomID, username: u });
    startScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
};

document.getElementById('join-btn').onclick = () => {
    const u = document.getElementById('username').value.trim();
    const r = document.getElementById('room-id').value.trim();
    if (u && r) { 
        currentRoom = r; 
        socket.emit('joinRoom', { roomID: r, username: u }); 
        startScreen.classList.add('hidden'); 
        lobbyScreen.classList.remove('hidden'); 
    } else { alert("Ism va xona nomini yozing!"); }
};

// --- CHAT & LOBBY ---
document.getElementById('send-btn').onclick = () => {
    if (chatInput.value.trim()) { socket.emit('chatMsg', { roomID: currentRoom, text: chatInput.value }); chatInput.value = ""; }
};
socket.on('newChatMsg', (d) => { msgDiv.innerHTML += `<div><b>${d.name}:</b> ${d.text}</div>`; msgDiv.scrollTop = msgDiv.scrollHeight; });

socket.on('roomUpdate', (data) => {
    playersWrapper.innerHTML = "";
    Object.values(data.players).forEach(p => {
        const pEl = document.createElement('div');
        pEl.innerHTML = `${p.isAdmin ? '<b style="color:yellow">[ADMIN]</b> ' : ''}${p.name} - ${p.ready ? '✅' : '⏳'}`;
        playersWrapper.appendChild(pEl);

        if (p.id === socket.id) {
            if (p.isAdmin) {
                document.getElementById('admin-controls').classList.remove('hidden');
                document.getElementById('start-game-btn').classList.remove('hidden');
            }
            if (!myCar) myCar = new Car(p.id, p.pos.x, p.pos.y, p.color, true);
            myCar.name = p.name;
        } else {
            if (!otherCars[p.id]) otherCars[p.id] = new Car(p.id, p.pos.x, p.pos.y, p.color, false);
            otherCars[p.id].name = p.name;
        }
    });
});

document.getElementById('ready-btn').onclick = () => socket.emit('toggleReady', currentRoom);
document.getElementById('start-game-btn').onclick = () => {
    const laps = document.getElementById('laps-count').value;
    socket.emit('requestStartGame', { roomID: currentRoom, laps: laps });
};

// --- O'YINNI BOSHLASH (Reset mantiqi bilan) ---
socket.on('startGame', (data) => {
    lobbyScreen.classList.add('hidden');
    winnerScreen.classList.add('hidden');
    isGameRunning = true;
    totalLapsRequired = data.laps;
    document.getElementById('total-laps').innerText = totalLapsRequired;
    document.getElementById('current-lap').innerText = "0";
    gameHud.classList.remove('hidden');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    track = new Track(canvas);

    // O'z mashinamizni startga qaytarish
    const serverMe = data.players[socket.id];
    if (myCar && serverMe) {
        myCar.pos.x = serverMe.pos.x;
        myCar.pos.y = serverMe.pos.y;
        myCar.angle = 0;
        myCar.speed = 0;
        myCar.laps = 0;
        myCar.passedCheckpoint = false;
    }

    // Boshqa mashinalarni startga qaytarish
    Object.keys(otherCars).forEach(id => {
        const serverOther = data.players[id];
        if (serverOther) {
            otherCars[id].pos.x = serverOther.pos.x;
            otherCars[id].pos.y = serverOther.pos.y;
            otherCars[id].targetPos.x = serverOther.pos.x;
            otherCars[id].targetPos.y = serverOther.pos.y;
            otherCars[id].angle = 0;
        }
    });
});

socket.on('gameFinished', (data) => {
    isGameRunning = false;
    gameHud.classList.add('hidden');
    winnerScreen.classList.remove('hidden');
    document.getElementById('winner-name').innerText = data.winner;
    setTimeout(() => {
        winnerScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
    }, 5000);
});

socket.on('playerMoved', (d) => { if (otherCars[d.id]) { otherCars[d.id].targetPos = d.pos; otherCars[d.id].targetAngle = d.angle; } });

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (isGameRunning && myCar) {
        track.draw(ctx);
        const lapChanged = myCar.update(input.keys, canvas, track, otherCars);
        if (lapChanged) {
            document.getElementById('current-lap').innerText = myCar.laps;
            socket.emit('lapCompleted', { roomID: currentRoom, laps: myCar.laps });
        }
        myCar.draw(ctx);
        socket.emit('playerUpdate', { roomID: currentRoom, pos: myCar.pos, angle: myCar.angle });
        Object.values(otherCars).forEach(car => { car.update(null, canvas, null, null); car.draw(ctx); });
    }
    requestAnimationFrame(animate);
}
animate();