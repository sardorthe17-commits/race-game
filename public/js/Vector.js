export class Vec2 {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    static add(v1, v2) { return new Vec2(v1.x + v2.x, v1.y + v2.y); }
    static sub(v1, v2) { return new Vec2(v1.x - v2.x, v1.y - v2.y); }
    static mul(v, n) { return new Vec2(v.x * n, v.y * n); }
    static dot(v1, v2) { return v1.x * v2.x + v1.y * v2.y; }
    static dist(v1, v2) {
        return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
    }
}