const mqtt = require('mqtt');

// ===============================
// CONFIGURACIÓN DEL BROKER
// ===============================
const brokerUrl = 'mqtt://3.134.98.196:1885';

const options = {
  clientId: 'cliente_js_' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000,
  // username: 'usuario',   // descomenta si usas auth
  // password: 'password',
  reconnectPeriod: 1000
};

const topic = 'test/topic';

// ===============================
// PAYLOAD JSON DE PRUEBA
// ===============================
const payload = {
  _id: "697d122620af25087693ea94",
  n_registro: 32,
  Timestamp: {
    Year: "26",
    Month: "01",
    Day: "30",
    Hour: "00",
    Minute: "28",
    Second: "39",
    Centisecond: "71"
  },
  bins: 53,
  Depth: 20683,
  Dmean: 61,
  Dp: 4,
  H1_10: 0.58,
  Hs: 0.46,
  Profile: [
    { Magnitude: 0.029, Direction: 12 },
    { Magnitude: 0.02, Direction: 15 },
    { Magnitude: 0.022, Direction: 16 },
    { Magnitude: 0.007, Direction: 188 },
    { Magnitude: -32768, Direction: -32768 }
  ],
  Tmean: 6.3,
  Tp: 14.9
};

// ===============================
// CONEXIÓN MQTT
// ===============================
const client = mqtt.connect(brokerUrl, options);

client.on('connect', () => {
  console.log('✅ Conectado al broker Mosquitto');

  // Publicar JSON
  client.publish(
    topic,
    JSON.stringify(payload),
    { qos: 1, retain: false },
    () => {
      console.log('📤 JSON enviado correctamente');
    }
  );

  // Suscribirse para comprobar recepción
  client.subscribe(topic);
});

client.on('message', (topic, message) => {
  console.log(`📩 Mensaje recibido en ${topic}:`);
  console.log(JSON.parse(message.toString()));
});

client.on('error', (error) => {
  console.error('❌ Error MQTT:', error);
});

client.on('close', () => {
  console.log('🔌 Conexión cerrada');
});
