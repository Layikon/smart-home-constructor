// static/js/404_handler.js

(function() {
    const logError = (title, detail) => {
        if (document.getElementById('error-overlay-404')) return;

        const overlay = document.createElement('div');
        overlay.id = 'error-overlay-404';
        overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.98);backdrop-filter:blur(10px);color:white;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;font-family:sans-serif;";

        overlay.innerHTML = `
            <div style="max-width:700px;width:100%;background:#1e293b;padding:40px;border-radius:20px;border:1px solid #334155;box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                <h2 style="color:#f8fafc;margin-top:0;font-size:22px;">⚠️ ${title}</h2>
                <div style="background:#0f172a;padding:20px;border-radius:12px;font-family:monospace;font-size:13px;color:#f43f5e;margin-bottom:20px;white-space:pre-wrap;word-break:break-all;border-left:4px solid #ef4444;">${detail}</div>
                <div style="display:flex;gap:12px;">
                    <button onclick="location.reload()" style="background:#3b82f6;color:white;border:none;padding:12px 24px;border-radius:8px;font-weight:bold;cursor:pointer;">🔄 Перезавантажити</button>
                    <button onclick="document.getElementById('error-overlay-404').remove()" style="background:transparent;color:#94a3b8;border:1px solid #475569;padding:12px 24px;border-radius:8px;cursor:pointer;">Закрити</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    };

    // 1. Ловимо фізичну відсутність файлу (404)
    window.addEventListener('error', function(event) {
        const target = event.target || event.srcElement;
        if (target instanceof HTMLElement && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
            const url = target.src || target.href;

            // Ігноруємо зовнішні скрипти
            if (url && !url.includes(window.location.host)) return;

            const fileName = url ? url.split('/').pop() : "Unknown";
            logError(
                `ФАЙЛ НЕ ЗНАЙДЕНО: ${fileName}`,
                `Не вдалося завантажити скрипт за адресою:\n${url}\n\nПеревірте шлях у "import" або чи файл існує на сервері.`
            );
        }
    }, true);

    // 2. Ловимо помилки імпорту модулів та синтаксису
    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason?.message || event.reason;
        logError(
            "ПОМИЛКА ЗАВАНТАЖЕННЯ МОДУЛЯ",
            `Опис: ${reason}\n\nЦе зазвичай означає, що один із внутрішніх "import" посилається на файл, якого не існує.`
        );
    });

    // 3. Глобальні помилки виконання
    window.onerror = function(message, source, lineno, colno, error) {
        if (source && !source.includes(window.location.host)) return;

        const file = source ? source.split('/').pop() : "JS Module";
        logError(
            `ПОМИЛКА У ФАЙЛІ: ${file}`,
            `Повідомлення: ${message}\nШлях: ${source}\nРядок: ${lineno}:${colno}`
        );
    };
})();