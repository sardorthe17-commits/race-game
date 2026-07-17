export class Network {
    constructor(player, otherCars, scene) {
        this.socket = io();
        this.player = player;
        this.otherCars = otherCars;
        this.scene = scene;

        this.socket.on('currentPlayers', (players) => {
            Object.keys(players).forEach(id => {
                if (id !== this.socket.id) scene.addOther(id, players[id]);
            });
        });

        this.socket.on('playerMoved', (data) => {
            if (this.otherCars[data.id]) {
                this.otherCars[data.id].targetPos = data.pos;
                this.otherCars[data.id].targetAngle = data.angle;
            } else {
                scene.addOther(data.id, data);
            }
        });

        this.socket.on('playerDisconnected', id => delete this.otherCars[id]);
    }

    sendUpdate() {
        this.socket.emit('playerUpdate', { pos: this.player.pos, angle: this.player.angle });
    }
}