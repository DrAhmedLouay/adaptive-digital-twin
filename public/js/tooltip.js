// public/js/tooltip.js
/**
 * Interactive Architectural Tooltip System.
 * Displays smart explanations when hovering over buttons, cards,
 * scenarios, and controls across the AdaptiveTwin platform.
 */

(function initTooltips() {
    let tooltipEl = null;

    function createTooltipElement() {
        if (tooltipEl) return tooltipEl;
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'app-tooltip';
        tooltipEl.id = 'global-app-tooltip';
        document.body.appendChild(tooltipEl);
        return tooltipEl;
    }

    function initTooltipListeners() {
        const el = createTooltipElement();

        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (!target) return;

            const text = target.getAttribute('data-tooltip');
            const title = target.getAttribute('data-tooltip-title');
            if (!text) return;

            let html = '';
            if (title) {
                html += `<div class="app-tooltip-title">💡 ${title}</div>`;
            }
            html += `<div>${text}</div>`;
            el.innerHTML = html;
            el.classList.add('visible');
            positionTooltip(e, el);
        });

        document.addEventListener('mousemove', (e) => {
            if (el.classList.contains('visible')) {
                positionTooltip(e, el);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                el.classList.remove('visible');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTooltipListeners);
    } else {
        initTooltipListeners();
    }

    function positionTooltip(e, el) {
        const padding = 12;
        let x = e.clientX + 14;
        let y = e.clientY + 14;

        const w = el.offsetWidth || 220;
        const h = el.offsetHeight || 60;

        // منع خروج التلميح خارج الحافة اليمنى للشاشة
        if (x + w > window.innerWidth - padding) {
            x = e.clientX - w - 14;
        }

        // منع خروج التلميح أسفل الشاشة
        if (y + h > window.innerHeight - padding) {
            y = e.clientY - h - 14;
        }

        el.style.left = `${Math.max(padding, x)}px`;
        el.style.top = `${Math.max(padding, y)}px`;
    }
})();
