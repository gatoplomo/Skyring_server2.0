const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');

const carpeta = 'C:\\TRDI\\ADCP_PMEJ\\WAVES';
const extensionLog8 = '_LOG8.TXT';  // Asegúrate de usar el sufijo correcto
const archivoVerifiedSuffix = '_LOG8_verified.TXT';  // Sufijo para el archivo verificado

let timer;
let archivosLog8 = []; // Para almacenar los archivos LOG8 encontrados
let indexArchivo = 0;

console.log(`🕵️ Observando la carpeta: ${carpeta} ...`);

// Función para obtener todos los archivos LOG8 en la carpeta
function obtenerArchivosLog8() {
    fs.readdir(carpeta, (err, archivos) => {
        if (err) {
            console.error(`❌ Error leyendo la carpeta: ${err.message}`);
            return;
        }
        
        // Filtrar archivos que contengan '_LOG8.TXT' en el nombre
        archivosLog8 = archivos.filter(archivo => archivo.includes(extensionLog8));
        console.log(`📂 Archivos LOG8 encontrados: ${archivosLog8.length}`);
        
        if (archivosLog8.length > 0) {
            // Comenzar el proceso con el primer archivo
            procesarArchivo();
        } else {
            console.log('❌ No se encontraron archivos LOG8 para procesar.');
        }
    });
}

// Función para procesar el siguiente archivo LOG8
function procesarArchivo() {
    if (indexArchivo < archivosLog8.length) {
        const archivo = archivosLog8[indexArchivo];
        console.log(`📄 Procesando archivo: ${archivo}`);
        
        // Verificar el archivo
        ejecutarVerificador(path.join(carpeta, archivo));
    } else {
        console.log('✅ Todos los archivos han sido procesados.');
    }
}

// Función para ejecutar el verificador
function ejecutarVerificador(rutaArchivo) {
    const comando = `python verificador.py "${rutaArchivo}"`;

    exec(comando, (error, stdout, stderr) => {
        if (error) return console.error(`❌ Error ejecutando verificador: ${error.message}`);
        if (stderr) console.warn(`⚠️ STDERR: ${stderr}`);

        console.log(`✅ Verificador completado para ${rutaArchivo}. Salida:\n${stdout}`);

        // Ahora el archivo verificado debe tener el sufijo '_LOG8_verified.TXT'
        const archivoVerified = path.join(carpeta, path.basename(rutaArchivo, extensionLog8) + '_LOG8_verified.TXT');
        enviarArchivo(archivoVerified);
    });
}

// Función para enviar el archivo al servidor
function enviarArchivo(rutaVerified) {
    if (!fs.existsSync(rutaVerified)) {
        console.error(`❌ No se encontró el archivo ${rutaVerified} para enviar.`);
        return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(rutaVerified));

    axios.post('http://10.132.225.171:3000/upload', form, {
        headers: form.getHeaders()
    })
    .then(respuesta => {
        console.log(`📤 Archivo enviado correctamente: ${respuesta.data}`);
        
        // Pasar al siguiente archivo después de un pequeño retraso
        indexArchivo++;
        setTimeout(procesarArchivo, 2000); // Retraso de 2 segundos entre envíos (puedes ajustarlo)
    })
    .catch(err => {
        console.error(`❌ Error al enviar el archivo: ${err.message}`);
        
        // Intentar con el siguiente archivo después del retraso
        indexArchivo++;
        setTimeout(procesarArchivo, 2000); // Retraso de 2 segundos entre envíos (puedes ajustarlo)
    });
}

// Iniciar el proceso de búsqueda de archivos LOG8 al iniciar
obtenerArchivosLog8();

// Si deseas que se actualice constantemente, puedes agregar un `fs.watch` si la carpeta se actualiza
fs.watch(carpeta, (eventType, filename) => {
    if (eventType === 'rename' && filename && filename.includes(extensionLog8)) {
        console.log(`👀 Archivo ${filename} añadido a la carpeta. Procesando...`);
        obtenerArchivosLog8(); // Volver a obtener los archivos actualizados
    }
});
