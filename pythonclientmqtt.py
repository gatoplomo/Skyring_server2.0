import json
import paho.mqtt.client as mqtt

# ===============================
# CONFIGURACIÓN
# ===============================
BROKER = "3.134.98.196"
PORT = 1885
TOPIC = "test/topic"

CLIENT_ID = "cliente_python_001"
# USERNAME = "usuario"   # descomenta si aplica
# PASSWORD = "password"

# ===============================
# CALLBACKS
# ===============================
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Conectado al broker Mosquitto")
        client.subscribe(TOPIC)
        print(f"📡 Suscrito al tópico: {TOPIC}")
    else:
        print(f"❌ Error de conexión, código: {rc}")

def on_message(client, userdata, msg):
    print(f"\n📩 Mensaje recibido en {msg.topic}")
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        print("📦 JSON recibido:")
        print(json.dumps(payload, indent=2))

        # 👉 Ejemplo de acceso a campos
        print("\n🔍 Datos clave:")
        print("Registro:", payload["n_registro"])
        print("Depth:", payload["Depth"])
        print("Hs:", payload["Hs"])
        print("Perfil (primer elemento):", payload["Profile"][0])

    except json.JSONDecodeError:
        print("⚠️ El mensaje no es un JSON válido")

def on_disconnect(client, userdata, rc):
    print("🔌 Desconectado del broker")

# ===============================
# CLIENTE MQTT
# ===============================
client = mqtt.Client(client_id=CLIENT_ID)

# Si usas usuario/contraseña
# client.username_pw_set(USERNAME, PASSWORD)

client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect

# ===============================
# CONEXIÓN
# ===============================
client.connect(BROKER, PORT, keepalive=60)

print("⏳ Esperando mensajes...")
client.loop_forever()
