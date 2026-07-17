export class Track {
    constructor(canvas) {
        this.width = canvas.width;
        this.height = canvas.height;
        this.outer = { x: 40, y: 40, w: this.width - 80, h: this.height - 80 };
        this.inner = { x: 220, y: 220, w: this.width - 440, h: this.height - 440 };
        this.finishLine = { x: 40, y: this.height / 2 - 50, w: 180, h: 20 };
        this.checkpoint = { x: this.width - 220, y: this.height / 2 - 50, w: 180, h: 20 };
    }

    draw(ctx) {
        ctx.fillStyle = "#111"; ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = "#333"; ctx.fillRect(this.outer.x, this.outer.y, this.outer.w, this.outer.h);
        ctx.strokeStyle = "white"; ctx.lineWidth = 5; ctx.strokeRect(this.outer.x, this.outer.y, this.outer.w, this.outer.h);
        ctx.fillStyle = "#1a5e1a"; ctx.fillRect(this.inner.x, this.inner.y, this.inner.w, this.inner.h);
        ctx.strokeRect(this.inner.x, this.inner.y, this.inner.w, this.inner.h);
        ctx.fillStyle = "white"; ctx.fillRect(this.finishLine.x, this.finishLine.y, this.finishLine.w, this.finishLine.h);
        ctx.fillStyle = "rgba(0, 255, 0, 0.1)"; ctx.fillRect(this.checkpoint.x, this.checkpoint.y, this.checkpoint.w, this.checkpoint.h);
    }

    checkWallCollision(car) {
        const margin = 15;
        let hit = false;
        if (car.pos.x < this.outer.x + margin) { car.pos.x = this.outer.x + margin; hit = true; }
        if (car.pos.x > this.outer.x + this.outer.w - margin) { car.pos.x = this.outer.x + this.outer.w - margin; hit = true; }
        if (car.pos.y < this.outer.y + margin) { car.pos.y = this.outer.y + margin; hit = true; }
        if (car.pos.y > this.outer.y + this.outer.h - margin) { car.pos.y = this.outer.y + this.outer.h - margin; hit = true; }
        if (car.pos.x > this.inner.x - margin && car.pos.x < this.inner.x + this.inner.w + margin &&
            car.pos.y > this.inner.y - margin && car.pos.y < this.inner.y + this.inner.h + margin) {
            const dL = Math.abs(car.pos.x - (this.inner.x - margin));
            const dR = Math.abs(car.pos.x - (this.inner.x + this.inner.w + margin));
            const dT = Math.abs(car.pos.y - (this.inner.y - margin));
            const dB = Math.abs(car.pos.y - (this.inner.y + this.inner.h + margin));
            const min = Math.min(dL, dR, dT, dB);
            if (min === dL) car.pos.x = this.inner.x - margin;
            else if (min === dR) car.pos.x = this.inner.x + this.inner.w + margin;
            else if (min === dT) car.pos.y = this.inner.y - margin;
            else car.pos.y = this.inner.y + this.inner.h + margin;
            hit = true;
        }
        if (hit) { car.speed *= -0.7; car.velocity.x *= -0.5; car.velocity.y *= -0.5; }
    }

    checkLap(car) {
        if (car.pos.x > this.checkpoint.x && car.pos.x < this.checkpoint.x + this.checkpoint.w &&
            car.pos.y > this.checkpoint.y && car.pos.y < this.checkpoint.y + this.checkpoint.h) {
            car.passedCheckpoint = true;
        }
        if (car.passedCheckpoint && 
            car.pos.x > this.finishLine.x && car.pos.x < this.finishLine.x + this.finishLine.w &&
            car.pos.y > this.finishLine.y && car.pos.y < this.finishLine.y + this.finishLine.h) {
            car.laps++; car.passedCheckpoint = false; return true;
        }
        return false;
    }
}