import { Vec2 } from './Vector.js';

export class Car {
    constructor(id, x, y, color, isLocal = false) {
        this.id = id;
        this.pos = new Vec2(x, y);
        this.velocity = new Vec2(0, 0);
        this.color = color;
        this.isLocal = isLocal;
        this.angle = 0;
        this.speed = 0;
        this.name = "";
        this.width = 40; this.height = 20;

        // Poyga mantiqi
        this.laps = 0;
        this.passedCheckpoint = false;

        this.maxSpeed = 1; this.accel = 0.15; this.friction = 0.95; this.driftFactor = 0.88;
        this.targetPos = new Vec2(x, y);
        this.targetAngle = 0;
    }

    update(keys, canvas, track, otherCars) {
        if (this.isLocal) {
            this.handleInput(keys);
            this.applyPhysics();
            if (track) {
                track.checkWallCollision(this);
                if (track.checkLap(this)) return true; // Lap oshganini bildirish
            }
            if (otherCars) this.checkCarCollision(otherCars);
        } else {
            this.interpolate();
        }
        return false;
    }

    handleInput(keys) {
        if (keys['ArrowUp'] || keys['w']) this.speed += this.accel;
        if (keys['ArrowDown'] || keys['s']) this.speed -= this.accel;
        let rev = (this.speed < 0) ? -1 : 1;
        if (keys['ArrowLeft'] || keys['a']) this.angle -= 0.05 * rev;
        if (keys['ArrowRight'] || keys['d']) this.angle += 0.05 * rev;
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;
    }

    applyPhysics() {
        this.speed *= this.friction;
        const dir = new Vec2(Math.cos(this.angle), Math.sin(this.angle));
        const fv = Vec2.mul(dir, Vec2.dot(this.velocity, dir));
        const rd = new Vec2(-dir.y, dir.x);
        const lv = Vec2.mul(rd, Vec2.dot(this.velocity, rd));
        this.velocity = Vec2.add(fv, Vec2.mul(lv, this.driftFactor));
        this.velocity.x += dir.x * this.speed * 0.1;
        this.velocity.y += dir.y * this.speed * 0.1;
        this.pos.x += this.velocity.x; this.pos.y += this.velocity.y;
    }

    checkCarCollision(otherCars) {
        Object.values(otherCars).forEach(other => {
            const d = Vec2.dist(this.pos, other.pos);
            if (d < 30) {
                const p = Vec2.sub(this.pos, other.pos);
                const f = (30 - d) / 10;
                this.pos.x += p.x * f; this.pos.y += p.y * f;
                this.speed *= 0.8;
            }
        });
    }

    interpolate() {
        this.pos.x += (this.targetPos.x - this.pos.x) * 0.2;
        this.pos.y += (this.targetPos.y - this.pos.y) * 0.2;
        let d = this.targetAngle - this.angle;
        while (d < -Math.PI) d += Math.PI * 2;
        while (d > Math.PI) d -= Math.PI * 2;
        this.angle += d * 0.2;
    }

    draw(ctx) {
        ctx.save(); ctx.translate(this.pos.x, this.pos.y);
        ctx.fillStyle = "white"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center";
        ctx.fillText(this.name, 0, -25);
        ctx.rotate(this.angle); ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.fillStyle = "black"; ctx.fillRect(this.width/6, -this.height/2 + 2, 8, this.height - 4);
        ctx.restore();
    }
}