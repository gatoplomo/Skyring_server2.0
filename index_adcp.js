const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');

const carpeta = 'C:\\TRDI\\ADCP_PMEJ\\WAVES';
const archivoOriginal = 'WAVES_007_000_TS2601072203_LOG8.TXT';
const archivoVerified = 'WAVES_007_000_TS2601072203_LOG8_verified.TXT';

let timer;

console.log(`🕵️ Observando la carpeta: ${carpeta} ...`);

fs.watch(carpeta, (eventType, filename) => {
    if (!filename) return;
    if (filename !== archivoOriginal) return;

    console.log(`📄 Archivo ${filename} detectado (${eventType})`);

    clearTimeout(timer);
    timer = setTimeout(() => {
        console.log(`✅ Archivo ${archivoOriginal} estable. Ejecutando verificador...`);
        ejecutarVerificador(path.join(carpeta, archivoOriginal));
    }, 2000); // 2 segundos sin cambios
});

function ejecutarVerificador(rutaArchivo) {
    const comando = `python verificador.py "${rutaArchivo}"`;

    exec(comando, (error, stdout, stderr) => {
        if (error) return console.error(`❌ Error ejecutando verificador: ${error.message}`);
        if (stderr) console.warn(`⚠️ STDERR: ${stderr}`);

        console.log(`✅ Verificador completado. Salida:\n${stdout}`);
        enviarArchivo(path.join(carpeta, archivoVerified));
    });
}

function enviarArchivo(rutaVerified) {
    if (!fs.existsSync(rutaVerified)) {
        console.error(`❌ No se encontró el archivo ${archivoVerified} para enviar.`);
        return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(rutaVerified));

    axios.post('http://10.50.82.171:3000/upload', form, {
        headers: form.getHeaders()
    })
    .then(respuesta => console.log(`📤 Archivo enviado correctamente: ${respuesta.data}`))
    .catch(err => console.error(`❌ Error al enviar el archivo: ${err.message}`));
}
