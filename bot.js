require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors(), express.json());

const mongoUrl = process.env.MONGO_URL || 'mongodb://3.134.98.196:27017';
const dbName = 'myproject';
let db;

// Memoria temporal para las sesiones de usuario
const sessions = {};

MongoClient.connect(mongoUrl, { useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        console.log('✅ Motor de búsqueda conectado');
    })
    .catch(err => console.error('❌ Error Mongo:', err));

// Helper para formatear fecha a patrón de colección (Ej: 2025-03-15 -> TS250315)
const formatDateToPattern = (dateStr) => {
    const parts = dateStr.split('-');
    return `TS${parts[0].substring(2, 4)}${parts[1]}${parts[2]}`;
};

app.post('/talk', async (req, res) => {
    const { input, userId = "default" } = req.body;
    const text = input ? input.toLowerCase().trim() : "";

    // 1. REINICIO O INICIO DE SESIÓN
    if (!sessions[userId] || ['hola', 'reiniciar', 'inicio', 'menu'].includes(text)) {
        sessions[userId] = { step: 'WELCOME' };
        return res.json({ 
            reply: "🤖 **Buscador de Registros**\n\n¿Qué desea hacer?\n1. Buscar por **fecha específica**\n2. Buscar por **rango de fechas**",
            step: "WELCOME"
        });
    }

    const state = sessions[userId];

    try {
        // --- PASO 1: SELECCIÓN DE MODO ---
        if (state.step === 'WELCOME') {
            if (text === '1' || text.includes('especifica')) {
                state.step = 'AWAITING_DATE';
                return res.json({ 
                    reply: "📅 **Fecha Específica**.\nIntroduzca la fecha (YYYY-MM-DD):",
                    step: state.step
                });
            } else if (text === '2' || text.includes('rango')) {
                state.step = 'AWAITING_RANGE_START';
                return res.json({ 
                    reply: "📏 **Rango de Fechas**.\nIntroduzca la fecha de **INICIO** (YYYY-MM-DD):",
                    step: state.step
                });
            } else {
                return res.json({ reply: "⚠️ Por favor, elija '1' (Fecha) o '2' (Rango)." });
            }
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        // --- PASO 2: BÚSQUEDA FECHA ESPECÍFICA ---
        if (state.step === 'AWAITING_DATE') {
            if (!dateRegex.test(text)) return res.json({ reply: "❌ Formato inválido. Use YYYY-MM-DD:" });

            const pattern = formatDateToPattern(text);
            const cols = await db.listCollections().toArray();
            const targets = cols.filter(c => c.name.includes(pattern));

            let totalDocs = 0;
            for (const col of targets) {
                totalDocs += await db.collection(col.name).countDocuments();
            }

            sessions[userId] = { step: 'WELCOME' }; // Reset tras finalizar
            return res.json({ 
                reply: `✅ **Resultados para ${text}**:\n- Colecciones: ${targets.length}\n- Registros: ${totalDocs}\n\nEscriba 'hola' para una nueva búsqueda.`,
                data: { date: text, count: totalDocs }
            });
        }

        // --- PASO 3: RANGO - FECHA INICIO ---
        if (state.step === 'AWAITING_RANGE_START') {
            if (!dateRegex.test(text)) return res.json({ reply: "❌ Formato inválido. Use YYYY-MM-DD:" });
            
            state.rangeStart = text;
            state.step = 'AWAITING_RANGE_END';
            return res.json({ reply: `📅 Inicio: ${text}. Ahora introduzca la fecha de **FIN** (YYYY-MM-DD):` });
        }

        // --- PASO 4: RANGO - FECHA FIN ---
        if (state.step === 'AWAITING_RANGE_END') {
            if (!dateRegex.test(text)) return res.json({ reply: "❌ Formato inválido. Use YYYY-MM-DD:" });

            const start = state.rangeStart;
            const end = text;

            // Aquí puedes añadir la lógica de agregación entre colecciones si lo necesitas
            sessions[userId] = { step: 'WELCOME' };
            return res.json({ 
                reply: `✅ Búsqueda configurada: del **${start}** al **${end}**.\n\nEscriba 'hola' para volver al inicio.`,
                range: { start, end }
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error interno en el motor de búsqueda." });
    }
});

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Motor de Búsqueda Secuencial en puerto ${PORT}`);
});