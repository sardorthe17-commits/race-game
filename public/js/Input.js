export class InputHandler {
    constructor() {
        this.keys = {};

        // --- KLAVIATURA BOSHQARUVI (PC UCHUN) ---
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key] = false;
        });

        // --- MOBIL TUGMALAR BOSHQARUVI ---
        this.setupMobileControls();
    }

    setupMobileControls() {
        const controls = [
            { id: 'btn-up', key: 'ArrowUp' },
            { id: 'btn-down', key: 'ArrowDown' },
            { id: 'btn-left', key: 'ArrowLeft' },
            { id: 'btn-right', key: 'ArrowRight' }
        ];

        controls.forEach(control => {
            const btn = document.getElementById(control.id);
            if (btn) {
                // Bosilganda (Touch yoki Sitchoncha bilan)
                const startAction = (e) => {
                    e.preventDefault(); // Brauzer menyusi chiqib ketmasligi uchun
                    this.keys[control.key] = true;
                };

                // Qo'yib yuborilganda
                const endAction = (e) => {
                    e.preventDefault();
                    this.keys[control.key] = false;
                };

                // Telefon ekranini bosganda
                btn.addEventListener('touchstart', startAction, { passive: false });
                btn.addEventListener('touchend', endAction, { passive: false });

                // Sitchoncha bilan test qilish uchun (ixtiyoriy)
                btn.addEventListener('mousedown', startAction);
                btn.addEventListener('mouseup', endAction);
                btn.addEventListener('mouseleave', endAction); // Tugmadan chetga chiqib ketsa ham to'xtasin
            }
        });
    }
}