// Ya tienes esto
const express = require('express');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const { exec } = require('child_process');

const hostname = '10.50.82.171';
const port = 3000;
const url = 'mongodb://3.134.98.196:27017';
const dbName = 'myproject';
let db;


// 🌍 Variable global para almacenar el último registro
let ultimoRegistro = null;


const carpetaTransferencia = path.join(__dirname, 'transferencia2');
const carpetaUploads = path.join(__dirname, 'uploads');
const archivoObjetivo = 'WAVES_007_000_TS2601072203_LOG8_verified.TXT';

const app = express();

// ===========================
// STATIC (ajuste de rutas)
// ===========================
// Mantiene el original (carpeta 'Public' con P mayúscula)
app.use(express.static(path.join(__dirname, 'Public')));

// 🔧 Soporte alterno si en la VM la carpeta es 'public' en minúsculas
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Solo añadimos el servido de imágenes y recursos front
app.use('/index_files', express.static(path.join(__dirname, 'Public/index_files')));
app.use('/images', express.static(path.join(__dirname, 'Public/images')));

// 🔧 Montajes espejo por si existen en minúsculas en la VM
app.use('/index_files', express.static(path.join(__dirname, 'public/index_files')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Mantienes todo lo que ya tenías
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpetaUploads),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

console.log('✅ SERVER CON PROCESO EXTERNO PYTHON');

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        console.log('✅ Conectado a MongoDB');
        db = client.db(dbName);

        app.listen(port, hostname, () => {
            console.log(`🚀 Servidor corriendo en http://${hostname}:${port}/`);
        });
    })
    .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// ===========================
// RUTAS
// ===========================

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public/index.html'));
});

// Ruta opcional para Cover anterior
app.get('/cover', (req, res) => {
    res.sendFile(path.join(__dirname, 'Cover Template for Bootstrap.html'));
});

// 🔧 Ruta explícita para dashboard (cubre /dashboard y /dashboard.html)
// Busca primero en Public/, luego en Public/pages/, y en minúsculas si aplica
app.get(['/dashboard', '/Dashboard.html'], (req, res) => {
    const candidatos = [
        path.join(__dirname, 'Public', 'Dashboard.html'),
        path.join(__dirname, 'Public', 'pages', 'Dashboard.html'),
        path.join(__dirname, 'public', 'Dashboard.html'),
        path.join(__dirname, 'public', 'pages', 'Dashboard.html'),
    ];
    const destino = candidatos.find(p => fs.existsSync(p));
    if (destino) return res.sendFile(destino);
    return res.status(404).send('Dashboard.html no encontrado en Public/ ni en public/');
});

// Ruta para upload
app.post('/upload', upload.single('file'), (req, res) => {
    console.log('📁 Archivo recibido:', req.file.originalname);
    res.send('Archivo recibido correctamente');
});

// Watcher transferencia2
console.log(`🕵️ Observando la carpeta: ${carpetaTransferencia} ...`);
fs.watch(carpetaTransferencia, (eventType, filename) => {
    if (filename && path.extname(filename).toLowerCase() === '.txt') {
        console.log(`📄 Archivo en transferencia2 ${eventType}: ${filename}`);
    }
});

// Watcher uploads y proceso Python
console.log(`🕵️ Observando la carpeta: ${carpetaUploads} ...`);

let timer;
let procesando = false;

fs.watch(carpetaUploads, (eventType, filename) => {
    if (!filename) return;
    if (filename !== archivoObjetivo) return;

    console.log(`📁 Archivo recibido en uploads ${eventType}: ${filename}`);

    clearTimeout(timer);

    timer = setTimeout(() => {
        if (procesando) {
            console.log('⚠️ Ya se está procesando un archivo, se ignora este evento.');
            return;
        }

        procesando = true;

        const fullPath = path.join(carpetaUploads, filename);
        console.log(`🚀 Ejecutando verificación externa sobre: ${filename}`);

        exec(`python verified.py "${fullPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error ejecutando Python: ${error.message}`);
                procesando = false;
                return;
            }
            if (stderr) {
                console.error(`⚠️ STDERR: ${stderr}`);
            }
            if (stdout) {
                console.log(`📊 Verificación Python recibida:`);

                const lineas = stdout.trim().split('\n');
                console.log(`🔢 Total de líneas detectadas: ${lineas.length}`);

                lineas.forEach(registro => {
                    const datos = registro.split(',').map(d => d.trim());

                    if (datos.length < 16 || isNaN(parseFloat(datos[0]))) {
                        console.log(`ℹ️ Línea ignorada (control o inválida): ${registro}`);
                        return;
                    }

                    const profile = [];
                    for (let i = 16; i < datos.length - 1; i += 2) {
                        const mag = parseFloat(datos[i]);
                        const dir = parseFloat(datos[i + 1]);
                        if (isNaN(mag) || isNaN(dir)) continue;

                        profile.push({
                            Magnitude: mag,
                            Direction: dir
                        });
                    }

                    const doc = {
                        Timestamp: {
                            Year: datos[1],
                            Month: datos[2],
                            Day: datos[3],
                            Hour: datos[4],
                            Minute: datos[5],
                            Second: datos[6],
                            Centisecond: datos[7]
                        },
                        Hs: parseFloat(datos[8]),
                        Tp: parseFloat(datos[9]),
                        Dp: parseFloat(datos[10]),
                        Depth: parseFloat(datos[11]),
                        'H1/10': parseFloat(datos[12]),
                        Tmean: parseFloat(datos[13]),
                        Dmean: parseFloat(datos[14]),
                        '#bins': parseInt(datos[15]),
                        Profile: profile,
                        n_registro: parseInt(datos[0])
                    };

                    // Validación rápida de campos críticos antes de insertar
                    if (isNaN(doc.Hs) || isNaN(doc.Tp) || isNaN(doc.Depth) || isNaN(doc.n_registro)) {
                        console.error(`❌ Registro inválido, campos numéricos corruptos:`, registro);
                        return;
                    }

                const key = {
  n_registro: doc.n_registro,
  "Timestamp.Year": doc.Timestamp.Year,
  "Timestamp.Month": doc.Timestamp.Month,
  "Timestamp.Day": doc.Timestamp.Day,
  "Timestamp.Hour": doc.Timestamp.Hour,
  "Timestamp.Minute": doc.Timestamp.Minute,
  "Timestamp.Second": doc.Timestamp.Second,
  "Timestamp.Centisecond": doc.Timestamp.Centisecond
};

// 🧷 Upsert idempotente: inserta si no existe; si existe, NO reescribe nada
db.collection(archivoObjetivo).updateOne(
  key,
  { $setOnInsert: doc },
  { upsert: true, writeConcern: { w: "majority" } }
)
.then(r => {
  if (r.upsertedCount === 1) {
    console.log(`✅ Registro ${doc.n_registro} insertado (nuevo)`);
  } else {
    console.log(`↔️ Registro ${doc.n_registro} ya existía; no se modificó`);
  }
})
.catch(err => console.error(`❌ Error upsert registro ${doc.n_registro}:`, err));
                });

                console.log(`✅ Proceso completo. Esperando nuevos archivos...`);
            }

            procesando = false;
        });

    }, 2000);
});

app.get('/registros', async (req, res) => {
    try {
        console.log('📥 Ruta /registros consultada');

        const registros = await db.collection('registros')
                                  .find({})
                                  .sort({ n_registro: 1 })
                                  .toArray();

        // ⬇️ obtenemos el último registro directamente desde Mongo
        const ultimo = await db.collection('registros')
                               .findOne({}, { sort: { n_registro: -1 } });

      if (ultimo) {
    ultimoRegistro = ultimo; // lo guardamos en variable global

    console.log('🆕 Último registro actualizado:');
    console.log(`   🔢 n_registro: ${ultimoRegistro.n_registro}`);
    console.log(`   🌊 Hs (m): ${ultimoRegistro.Hs}`);
    console.log(`   ⏱️ Tp (s): ${ultimoRegistro.Tp}`);
    console.log(`   🧭 Dir (°): ${ultimoRegistro.Dp}`);   // o Dmean si prefieres la dirección media
    console.log(`   📏 Dep (m): ${ultimoRegistro.Depth}`);
} else {
            console.log('⚠️ No hay registros en la base de datos.');
        }

        res.json(registros);

    } catch (err) {
        console.error('❌ Error al obtener registros:', err);
        res.status(500).send('Error al obtener los registros de MongoDB');
    }
});


app.get('/logs', async (req, res) => {
    try {
        console.log('📥 Ruta /logs consultada');

        // Obtener los nombres de las colecciones en la base de datos
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);

        console.log('📝 Colecciones disponibles:', collectionNames);

        res.json({ collections: collectionNames });

    } catch (err) {
        console.error('❌ Error al obtener las colecciones:', err);
        res.status(500).send('Error al obtener las colecciones de MongoDB');
    }
});
