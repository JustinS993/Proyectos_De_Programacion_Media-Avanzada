export class Validator {
    constructor() {
        this.worker = null;
    }

    /**
     * Ejecuta el código en un Web Worker para seguridad y aislamiento.
     */
    static runCode(code, testCases) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('worker.js');
            
            const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error("Tiempo de ejecución excedido (Bucle infinito detectado)"));
            }, 3000); // 3 segundos de límite

            worker.onmessage = (e) => {
                clearTimeout(timeout);
                worker.terminate();
                if (e.data.type === 'RESULT') {
                    resolve(e.data);
                } else {
                    reject(new Error(e.data.message));
                }
            };

            worker.onerror = (err) => {
                clearTimeout(timeout);
                worker.terminate();
                reject(err);
            };

            worker.postMessage({ code, testCases });
        });
    }

    static renderTestCases(results, logs) {
        const panel = document.getElementById('test-cases-panel');
        const feedback = document.getElementById('feedback-text');
        
        panel.innerHTML = '<strong>Resultados de Pruebas:</strong><br>';
        
        results.forEach(res => {
            const item = document.createElement('div');
            item.className = 'test-case-item';
            const statusClass = res.passed ? 'test-case-success' : 'test-case-fail';
            const statusIcon = res.passed ? '✓' : '✗';
            
            item.innerHTML = `
                <span>${statusIcon} Test: ${res.input}</span>
                <span class="${statusClass}">${res.passed ? 'Pasó' : 'Falló'}</span>
            `;
            panel.appendChild(item);
        });

        // Renderizar logs en la consola
        if (logs && logs.length > 0) {
            feedback.innerHTML = logs.map(log => `<div>> ${log}</div>`).join('');
            feedback.scrollTop = feedback.scrollHeight;
        }
    }
}
