export class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.opacity = 0.5;
        this.life = 1.0;
    }

    update() {
        this.life -= 0.02;
        this.opacity -= 0.02;
        this.size += 0.2;
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(150, 150, 150, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}