import { Car } from './Car.js';
import { InputHandler } from './Input.js';
import { Track } from './Track.js';

const socket = io(); // Render-da avtomatik ulanadi
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
const lapsInput = document.getElementById('laps-count');

// --- SERVER BILAN ULANISHNI TEKSHIRISH ---
socket.on('connect', () => {
    console.log("Serverga ulanish muvaffaqiyatli!");
});

socket.on('connect_error', (err) => {
    console.error("Ulanishda xato:", err);
});

// --- ROOM BROWSER (Xonalar ro'yxati) ---
socket.on('roomListUpdate', (roomList) => {
    if (!roomListDiv) return;
    roomListDiv.innerHTML = "";
    
    if (!roomList || roomList.length === 0) {
        roomListDiv.innerHTML = "<p style='color:#777'>Xonalar yo'q...</p>";
        return;
    }

    roomList.forEach(room => {
        const div = document.createElement('div');
        div.style = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #444; align-items:center;";
        const status = room.isStarted ? "<span style='color:red'>O'yin ketmoqda</span>" : "<span style='color:cyan'>Kutilmoqda</span>";
        
        div.innerHTML = `
            <span><b>${room.id}</b> (${room.playerCount} o'yinchi)</span> 
            ${status} 
            <button onclick="joinSpecificRoom('${room.id}')" ${room.isStarted ? 'disabled' : ''}>KIRISH</button>
        `;
        roomListDiv.appendChild(div);
    });
});

// Ro'yxatdan kirish (Global funksiya)
window.joinSpecificRoom = (roomID) => {
    const u = document.getElementById('username').value.trim();
    if (!u) return alert("Avval ismingizni yozing!");
    currentRoom = roomID;
    socket.emit('joinRoom', { roomID: roomID, username: u });
    startScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
};

// Yangi xona yaratish
document.getElementById('join-btn').onclick = () => {
    const u = document.getElementById('username').value.trim();
    const r = document.getElementById('room-id').value.trim();
    if (u && r) { 
        currentRoom = r; 
        socket.emit('joinRoom', { roomID: r, username: u }); 
        startScreen.classList.add('hidden'); 
        lobbyScreen.classList.remove('hidden'); 
    } else { 
        alert("Ism va xona nomini yozing!"); 
    }
};

// --- CHAT ---
document.getElementById('send-btn').onclick = () => {
    const text = chatInput.value.trim();
    if (text && currentRoom) { 
        socket.emit('chatMsg', { roomID: currentRoom, text }); 
        chatInput.value = ""; 
    }
};

chatInput.onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('send-btn').onclick();
};

socket.on('newChatMsg', (d) => { 
    if (msgDiv) {
        msgDiv.innerHTML += `<div><b>${d.name}:</b> ${d.text}</div>`; 
        msgDiv.scrollTop = msgDiv.scrollHeight; 
    }
});

// --- ROOM & PLAYERS ---
socket.on('roomUpdate', (data) => {
    if (!playersWrapper) return;
    playersWrapper.innerHTML = "";
    
    Object.values(data.players).forEach(p => {
        const pEl = document.createElement('div');
        pEl.innerHTML = `${p.isAdmin ? '<b style="color:yellow">[ADMIN]</b> ' : ''}${p.name} - ${p.ready ? '✅' : '⏳'}`;
        playersWrapper.appendChild(pEl);

        if (p.id === socket.id) {
            // Admin boshqaruvlari
            const adminControls = document.getElementById('admin-controls');
            const startBtn = document.getElementById('start-game-btn');
            if (p.isAdmin) {
                if (adminControls) adminControls.classList.remove('hidden');
                if (startBtn) startBtn.classList.remove('hidden');
            }
            // O'z mashinangizni yaratish (faqat bir marta)
            if (!myCar) {
                myCar = new Car(p.id, p.pos.x, p.pos.y, p.color, true);
            }
            myCar.name = p.name;
        } else {
            // Boshqa o'yinchilarni yaratish
            if (!otherCars[p.id]) {
                otherCars[p.id] = new Car(p.id, p.pos.x, p.pos.y, p.color, false);
            }
            otherCars[p.id].name = p.name;
        }
    });
});

document.getElementById('ready-btn').onclick = () => {
    socket.emit('toggleReady', currentRoom);
};

document.getElementById('start-game-btn').onclick = () => {
    const laps = lapsInput ? lapsInput.value : 3;
    socket.emit('requestStartGame', { roomID: currentRoom, laps: laps });
};

// --- O'YINNI BOSHLASH ---
socket.on('startGame', (data) => {
    lobbyScreen.classList.add('hidden');
    winnerScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    
    isGameRunning = true;
    totalLapsRequired = data.laps || 3;
    
    document.getElementById('total-laps').innerText = totalLapsRequired;
    document.getElementById('current-lap').innerText = "0";
    gameHud.classList.remove('hidden');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    track = new Track(canvas);

    // Mashinalarni startga reset qilish
    if (myCar && data.players[socket.id]) {
        const me = data.players[socket.id];
        myCar.pos.x = me.pos.x;
        myCar.pos.y = me.pos.y;
        myCar.angle = 0;
        myCar.speed = 0;
        myCar.laps = 0;
        myCar.passedCheckpoint = false;
    }

    Object.keys(otherCars).forEach(id => {
        const other = data.players[id];
        if (other) {
            otherCars[id].pos.x = other.pos.x;
            otherCars[id].pos.y = other.pos.y;
            otherCars[id].targetPos.x = other.pos.x;
            otherCars[id].targetPos.y = other.pos.y;
            otherCars[id].angle = 0;
        }
    });
});

// --- O'YIN TUGASHI ---
socket.on('gameFinished', (data) => {
    isGameRunning = false;
    gameHud.classList.add('hidden');
    winnerScreen.classList.remove('hidden');
    document.getElementById('winner-name').innerText = data.winner;
    
    setTimeout(() => {
        winnerScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
        // Reset local states
        if (myCar) {
            myCar.speed = 0;
            myCar.laps = 0;
        }
    }, 5000);
});

socket.on('playerMoved', (d) => { 
    if (otherCars[d.id]) { 
        otherCars[d.id].targetPos = d.pos; 
        otherCars[d.id].targetAngle = d.angle; 
    } 
});

// --- ANIMATION ---
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (isGameRunning && myCar && track) {
        track.draw(ctx);
        
        const lapChanged = myCar.update(input.keys, canvas, track, otherCars);
        if (lapChanged) {
            document.getElementById('current-lap').innerText = myCar.laps;
            socket.emit('lapCompleted', { roomID: currentRoom, laps: myCar.laps });
        }
        
        myCar.draw(ctx);
        
        // Pozitsiyani serverga yuborish
        socket.emit('playerUpdate', { roomID: currentRoom, pos: myCar.pos, angle: myCar.angle });

        // Boshqa o'yinchilarni chizish
        Object.values(otherCars).forEach(car => { 
            car.update(null, canvas, null, null); 
            car.draw(ctx); 
        });
    }

    requestAnimationFrame(animate);
}

animate();