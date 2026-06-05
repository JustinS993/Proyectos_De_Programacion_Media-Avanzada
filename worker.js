self.onmessage = function(e) {
    const { code, testCases } = e.data;
    
    const results = [];
    const logs = [];
    let allPassed = true;

    // Redirigir console.log para capturarlo
    const originalLog = console.log;
    console.log = function(...args) {
        logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
    };

    try {
        testCases.forEach((tc, index) => {
            try {
                // Envolvemos el código del usuario en un bloque para evitar colisiones de nombres
                const fullCode = `
                    ${code}
                    return (function() { 
                        return ${tc.input}; 
                    })();
                `;
                
                const userFn = new Function(fullCode);
                const output = userFn();
                
                const passed = JSON.stringify(output) === JSON.stringify(tc.expected);
                
                results.push({
                    id: index,
                    input: tc.input,
                    expected: tc.expected,
                    output: output,
                    passed: passed
                });
                
                if (!passed) allPassed = false;
            } catch (err) {
                results.push({
                    id: index,
                    input: tc.input,
                    error: err.message,
                    passed: false
                });
                allPassed = false;
            }
        });

        self.postMessage({ type: 'RESULT', results, logs, allPassed });
    } catch (globalErr) {
        self.postMessage({ type: 'ERROR', message: globalErr.message, logs });
    } finally {
        console.log = originalLog;
    }
};
