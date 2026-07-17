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
const lapsInput = document.getElementById('laps-count');
const mobileControls = document.getElementById('mobile-controls');

// --- EKRAN O'LCHAMINI MOSLASHTIRISH ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (track) track.resize(canvas); // Agar Track.js da resize bo'lsa
}
window.addEventListener('resize', resizeCanvas);

// --- SERVER BILAN ULANISH ---
socket.on('connect', () => {
    console.log("Serverga ulanish muvaffaqiyatli!");
});

// --- ROOM BROWSER ---
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
            <span><b>${room.id}</b> (${room.playerCount})</span> 
            <button onclick="joinSpecificRoom('${room.id}')" ${room.isStarted ? 'disabled' : ''}>KIRISH</button>
        `;
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
        pEl.innerHTML = `${p.isAdmin ? '<b style="color:yellow">[A]</b> ' : ''}${p.name} - ${p.ready ? '✅' : '⏳'}`;
        playersWrapper.appendChild(pEl);

        if (p.id === socket.id) {
            const adminControls = document.getElementById('admin-controls');
            const startBtn = document.getElementById('start-game-btn');
            if (p.isAdmin) {
                if (adminControls) adminControls.classList.remove('hidden');
                if (startBtn) startBtn.classList.remove('hidden');
            }
            if (!myCar) myCar = new Car(p.id, p.pos.x, p.pos.y, p.color, true);
            myCar.name = p.name;
        } else {
            if (!otherCars[p.id]) otherCars[p.id] = new Car(p.id, p.pos.x, p.pos.y, p.color, false);
            otherCars[p.id].name = p.name;
        }
    });
});

document.getElementById('ready-btn').onclick = () => {
    socket.emit('toggleReady', currentRoom);
};

document.getElementById('start-game-btn').onclick = () => {
    const laps = parseInt(lapsInput.value) || 3; 
    socket.emit('requestStartGame', { roomID: currentRoom, laps: laps });
};

// --- O'YINNI BOSHLASH (MOBIL MOSLASHUV SHU YERDA) ---
socket.on('startGame', (data) => {
    lobbyScreen.classList.add('hidden');
    winnerScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    
    isGameRunning = true;
    totalLapsRequired = data.laps || 3;
    
    document.getElementById('total-laps').innerText = totalLapsRequired;
    document.getElementById('current-lap').innerText = "0";
    gameHud.classList.remove('hidden');

    // MOBIL BOSHQARUVNI KO'RSATISH
    if (window.isMobileUser && window.isMobileUser()) {
        mobileControls.classList.remove('hidden');
    }

    resizeCanvas();
    track = new Track(canvas);

    if (myCar && data.players[socket.id]) {
        const me = data.players[socket.id];
        myCar.pos.x = me.pos.x;
        myCar.pos.y = me.pos.y;
        myCar.angle = 0;
        myCar.speed = 0;
        myCar.laps = 0;
    }
});

// --- O'YIN TUGASHI ---
socket.on('gameFinished', (data) => {
    isGameRunning = false;
    gameHud.classList.add('hidden');
    mobileControls.classList.add('hidden'); // Mobil tugmalarni yashirish
    winnerScreen.classList.remove('hidden');
    document.getElementById('winner-name').innerText = data.winner;
    
    setTimeout(() => {
        winnerScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
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
        
        // input.keys endi ham klaviatura, ham mobil tugmalarni o'z ichiga oladi
        const lapChanged = myCar.update(input.keys, canvas, track, otherCars);
        
        if (lapChanged) {
            document.getElementById('current-lap').innerText = myCar.laps;
            socket.emit('lapCompleted', { roomID: currentRoom, laps: myCar.laps });
        }
        
        myCar.draw(ctx);
        socket.emit('playerUpdate', { roomID: currentRoom, pos: myCar.pos, angle: myCar.angle });

        Object.values(otherCars).forEach(car => { 
            car.update(null, canvas, null, null); 
            car.draw(ctx); 
        });
    }

    requestAnimationFrame(animate);
}

animate();