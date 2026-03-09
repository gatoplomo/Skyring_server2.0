const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const cors = require('cors'); // ✅ Importado correctamente

// 1. PRIMERO inicializa la app
const app = express(); 

// 2. SEGUNDO aplica los middlewares
app.use(cors()); // ✅ Ahora sí funciona porque 'app' ya existe
app.use(express.json()); 

const hostname = '0.0.0.0'; // ✅ RECOMENDACIÓN: Usa 0.0.0.0 en AWS para evitar problemas de bind con la IP privada
const port = 3000;
const carpetaUploads = path.join(__dirname, 'uploads');
const mongoUrl = 'mongodb://3.134.98.196:27017'; 
const dbName = 'myproject'; 

// ==========================================
// STATIC (Optimizado para AWS/Linux)
// ==========================================

// Definimos una sola fuente de verdad para evitar conflictos de mayúsculas
const publicPath = path.join(__dirname, 'Public'); 

// Servir archivos raíz (index.html, etc.)
app.use(express.static(publicPath));

// Servir recursos específicos
app.use('/index_files', express.static(path.join(publicPath, 'index_files')));
app.use('/images', express.static(path.join(publicPath, 'images')));

// ===========================
// CONFIGURACIÓN DE MULTER
// ===========================
// Asegúrate de que la carpeta 'uploads' exista en la raíz de tu proyecto en AWS
if (!fs.existsSync(carpetaUploads)) {
    fs.mkdirSync(carpetaUploads);
}


// ===========================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpetaUploads),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

let db;
MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        console.log('✅ Conectado a MongoDB');
        db = client.db(dbName);
    })
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

console.log('✅ SERVIDOR LISTO PARA RECIBIR ARCHIVOS Y PROCESARLOS');

// ===========================
// RUTA PARA SUBIR ARCHIVOS
// ===========================
let archivosCargados = [];
let uploadTimeout;  // Variable para el temporizador

app.post('/upload', upload.single('file'), (req, res) => {
    console.log(`📁 Archivo recibido: ${req.file.originalname}`);
    res.send('Archivo recibido correctamente');
    
    // Añadimos el archivo al arreglo de archivos cargados
    archivosCargados.push(req.file.originalname);

    // Cancelamos el temporizador anterior, si lo hay
    clearTimeout(uploadTimeout);

    // Iniciar el temporizador de 10 segundos
    uploadTimeout = setTimeout(() => {
        console.log("📁 Todos los archivos fueron recibidos. Iniciando el análisis de archivos...");
        explorarArchivos();
    }, 10000);  // Espera 10 segundos

    console.log("🕒 Esperando 10 segundos para asegurar que no lleguen más archivos...");
});

// ===========================
// FUNCIONES DE PROCESAMIENTO
// ===========================

function explorarArchivos() {
    let index = 0; // Para llevar el control de los archivos

    // Función para procesar un archivo
    function procesarSiguienteArchivo() {
        if (index >= archivosCargados.length) {
            console.log('✅ Todos los archivos han sido procesados.');
            return;
        }

        const archivo = archivosCargados[index];
        const archivoPath = path.join(carpetaUploads, archivo);
        console.log(`🚀 Procesando archivo: ${archivo}`);

        // Leer el archivo y procesar el contenido
        fs.readFile(archivoPath, 'utf8', (err, data) => {
            if (err) {
                console.error(`❌ Error leyendo el archivo: ${err.message}`);
                return;
            }

            // Procesamos cada línea del archivo
            const lineas = data.trim().split('\n');
            console.log(`📊 Total de líneas detectadas: ${lineas.length}`);

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

                // Obtener el nombre del archivo sin la extensión
                const nombreColeccion = path.basename(archivo, path.extname(archivo));  // Usamos el nombre del archivo como nombre de la colección
                
                // Insertar el documento en la colección correspondiente
                insertarEnMongoDB(doc, nombreColeccion);
            });

            // Continuamos con el siguiente archivo después de un pequeño retraso
            index++;
            setTimeout(procesarSiguienteArchivo, 1000); // Retraso de 1 segundo entre archivos
        });
    }

    // Empezamos el procesamiento del primer archivo
    procesarSiguienteArchivo();
}

// Función para insertar el registro en MongoDB
function insertarEnMongoDB(doc, nombreColeccion) {
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
    db.collection(nombreColeccion).updateOne(
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
}

// ===========================
// INICIO DEL SERVIDOR
// ===========================
app.listen(port, hostname, () => {
    console.log(`🚀 Servidor corriendo en http://${hostname}:${port}/`);
});


app.get('/registros', async (req, res) => {
    try {
        console.log('📥 Ruta /registros consultada');

        // 🔹 1️⃣ Obtenemos todas las colecciones
        const colecciones = await db.listCollections().toArray();
        const nombresColecciones = colecciones.map(col => col.name);

        // 🔹 2️⃣ Filtramos solo las colecciones con formato TSYYMMDD
        const coleccionesValidas = nombresColecciones.filter(name => /TS\d{6}/.test(name));

        if (coleccionesValidas.length === 0) {
            console.log('⚠️ No hay colecciones válidas en la base de datos.');
            return res.status(404).send('No hay colecciones válidas.');
        }

        // 🔹 3️⃣ Función para extraer fecha de la colección
        const parseFecha = (nombre) => {
            const year = '20' + nombre.slice(nombre.indexOf('TS') + 2, nombre.indexOf('TS') + 4);
            const month = nombre.slice(nombre.indexOf('TS') + 4, nombre.indexOf('TS') + 6);
            const day = nombre.slice(nombre.indexOf('TS') + 6, nombre.indexOf('TS') + 8);
            return new Date(`${year}-${month}-${day}`);
        };

        // 🔹 4️⃣ Seleccionamos la colección más reciente
        const coleccionMasNueva = coleccionesValidas.reduce((masNueva, current) => {
            return parseFecha(current) > parseFecha(masNueva) ? current : masNueva;
        });

        console.log(`📅 Colección más nueva seleccionada: ${coleccionMasNueva}`);

        // 🔹 5️⃣ Obtenemos todos los registros de la colección más nueva
        const registros = await db.collection(coleccionMasNueva)
                                  .find({})
                                  .sort({ n_registro: 1 })
                                  .toArray();

        // 🔹 6️⃣ Obtenemos el último registro
        const ultimo = await db.collection(coleccionMasNueva)
                               .findOne({}, { sort: { n_registro: -1 } });

        if (ultimo) {
            ultimoRegistro = ultimo; // guardamos en variable global

            console.log('🆕 Último registro actualizado:');
            console.log(`   🔢 n_registro: ${ultimoRegistro.n_registro}`);
            console.log(`   🌊 Hs (m): ${ultimoRegistro.Hs}`);
            console.log(`   ⏱️ Tp (s): ${ultimoRegistro.Tp}`);
            console.log(`   🧭 Dir (°): ${ultimoRegistro.Dp}`); // o Dmean si prefieres la dirección media
            console.log(`   📏 Dep (m): ${ultimoRegistro.Depth}`);
        } else {
            console.log('⚠️ No hay registros en la base de datos.');
        }

        // 🔹 7️⃣ Respondemos al cliente con todos los registros
        res.json(registros);

    } catch (err) {
        console.error('❌ Error al obtener registros:', err);
        res.status(500).send('Error al obtener los registros de MongoDB');
    }
});

app.get('/allcollec', async (req, res) => {
    try {
        console.log('📥 Ruta /allcollec consultada');

        // 🔹 Obtenemos todas las colecciones de la base de datos
        const colecciones = await db.listCollections().toArray();
        const nombresColecciones = colecciones.map(col => col.name);

        if (nombresColecciones.length === 0) {
            console.log('⚠️ No hay colecciones en la base de datos.');
            return res.status(404).send('No hay colecciones en la base de datos.');
        }

        // 🔹 Para cada colección, obtenemos la cantidad de documentos
        const coleccionesConCantidad = await Promise.all(
            nombresColecciones.map(async nombre => {
                const collection = db.collection(nombre);
                const cantidad = await collection.countDocuments();
                return { nombre, cantidad };
            })
        );

        console.log(`📂 Colecciones encontradas con cantidad:`, coleccionesConCantidad);

        // 🔹 Respondemos al cliente
        res.json(coleccionesConCantidad);

    } catch (err) {
        console.error('❌ Error al obtener colecciones:', err);
        res.status(500).send('Error al obtener las colecciones de MongoDB');
    }
});



app.get('/lastCollection', async (req, res) => {
    try {
        console.log('📥 Ruta lastCollection consultada');

        const colecciones = await db.listCollections().toArray();
        const nombresColecciones = colecciones.map(col => col.name);

        if (nombresColecciones.length === 0) {
            return res.status(404).send('No hay colecciones en la base de datos.');
        }

        let ultimaColeccion = null;
        let fechaMasReciente = null;

        // Lógica de búsqueda de la colección más nueva (la que ya tienes)
        for (const nombre of nombresColecciones) {
            const match = nombre.match(/TS(\d{10})/);
            if (match) {
                const ts = match[1];
                const year = 2000 + parseInt(ts.substring(0, 2));
                const month = parseInt(ts.substring(2, 4)) - 1;
                const day = parseInt(ts.substring(4, 6));
                const hour = parseInt(ts.substring(6, 8));
                const minute = parseInt(ts.substring(8, 10));
                const fecha = new Date(year, month, day, hour, minute);

                if (!fechaMasReciente || fecha > fechaMasReciente) {
                    fechaMasReciente = fecha;
                    ultimaColeccion = nombre;
                }
            }
        }

        if (!ultimaColeccion) {
            return res.status(404).send('No se encontraron colecciones válidas.');
        }

        const col = db.collection(ultimaColeccion);
        const cantidad = await col.countDocuments();

        // 🔹 OBTENER EL PRIMER REGISTRO (El número más bajo)
        const primerRegistro = await col.findOne({}, { sort: { n_registro: 1 } });

        // 🔹 OBTENER EL ÚLTIMO REGISTRO (El número más alto / Datos actuales)
        const ultimoRegistro = await col.findOne({}, { sort: { n_registro: -1 } });

        res.json({
            nombre: ultimaColeccion,
            fechaExtraida: fechaMasReciente,
            cantidad: cantidad,
            primerRegistro: primerRegistro, // Contiene el n_registro inicial
            ultimoRegistro: ultimoRegistro  // Contiene los datos para los cuadros de colores y la boya
        });

    } catch (err) {
        console.error('❌ Error al obtener la última colección:', err);
        res.status(500).send('Error interno del servidor');
    }
});


app.get('/collection/:nombre', async (req, res) => {
    const { nombre } = req.params;

    console.log(`\n📅 [${new Date().toLocaleTimeString()}] Petición recibida:`);
    console.log(`📂 Colección consultada: "${nombre}"`);

    try {
        const col = db.collection(nombre);
        const cantidad = await col.countDocuments();

        if (cantidad === 0) {
            return res.status(404).json({ error: 'Colección no encontrada o vacía' });
        }

        // 🚀 AÑADIMOS 'todosLosRegistros' a la consulta paralela
        const [primerRegistro, ultimoRegistro, todosLosRegistros] = await Promise.all([
            col.findOne({}, { sort: { n_registro: 1 } }),
            col.findOne({}, { sort: { n_registro: -1 } }),
            col.find({}).sort({ n_registro: 1 }).toArray() // <--- ESTA ES LA CLAVE
        ]);

        console.log(`✅ ${cantidad} registros recuperados para tabla y gráficos.`);

        res.json({
            nombre: nombre,
            cantidad: cantidad,
            primerRegistro: primerRegistro,
            ultimoRegistro: ultimoRegistro,
            registros: todosLosRegistros // <--- AHORA SÍ VIAJAN LOS DATOS
        });

    } catch (err) {
        console.error(`❌ Error al procesar la colección "${nombre}":`, err);
        res.status(500).json({ error: 'Error interno' });
    }
});