const readline = require('readline');

// Configuración: URL del microservicio
const API_URL = 'http://localhost:4000/talk';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ' // Prompt minimalista
});

rl.on('line', async (line) => {
    const input = line.trim();

    if (input.toLowerCase() === 'salir' || input.toLowerCase() === 'exit') {
        process.exit(0);
    }

    if (!input) {
        rl.prompt();
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input })
        });

        const data = await response.json();

        // Muestra solo la respuesta del bot sin metadatos adicionales
        if (data.reply) {
            console.log(`${data.reply}`);
        }
        
    } catch (error) {
        console.error('❌ Error: Microservicio desconectado.');
    }

    rl.prompt();
});

// Inicia el prompt sin mensajes previos
rl.prompt();