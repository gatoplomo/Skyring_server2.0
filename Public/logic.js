

    /**
     * Abre y cierra el modal del Chat IA
     */
    function openCloseAI() {
        const modal = document.getElementById('marineModal');
        const icon = document.getElementById('iconLupa');
        
        if (modal.style.display === 'block') {
            modal.style.display = 'none';
            icon.className = 'bi bi-search'; // Vuelve a la lupa
        } else {
            modal.style.display = 'block';
            icon.className = 'bi bi-x-lg'; // Cambia a una X al abrir
            
            // Auto-focus al abrir
            setTimeout(() => {
                document.getElementById('aiInput').focus();
            }, 300);
        }
    }

    /**
     * Maneja el envío de mensajes al presionar Enter
     */
/**
 * Conecta el input del dashboard con el microservicio bot.js
 */
async function chatEngine(event) {
    if (event.key === 'Enter') {
        const inputElement = document.getElementById('aiInput');
        const chatBox = document.getElementById('aiConversation');
        const query = inputElement.value.trim();

        if (!query) return;

        // Mostrar mensaje del usuario en la UI
        chatBox.innerHTML += `<div class="user-msg"><strong>Tú:</strong> ${query}</div>`;
        inputElement.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            // Llamada al microservicio en el puerto 3333
            const response = await fetch('http://localhost:3333/interpret', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    input: query, 
                    userId: 'admin_user' // Puedes vincularlo a una sesión real
                })
            });

            const data = await response.json();

            // Manejar la respuesta según el estado que devuelve bot.js
            if (data.status === "DOWNLOAD") {
                // Si el bot genera un Excel, se abre el link de descarga
                chatBox.innerHTML += `<div class="bot-msg"><strong>[AI]:</strong> ${data.message}</div>`;
                window.open(`http://localhost:3333${data.downloadUrl}`, '_blank');
            } 
            else if (data.status === "OK") {
                // Los datos se inyectaron correctamente
                chatBox.innerHTML += `<div class="bot-msg"><strong>[AI]:</strong> ${data.message}</div>`;
                // Aquí podrías disparar una función para refrescar tus gráficas/tablas
                // Ejemplo: actualizarDashboard(); 
            } 
            else {
                // Mensajes de flujo (WAITING) o menús
                const formattedMsg = data.message.replace(/\n/g, '<br>');
                chatBox.innerHTML += `<div class="bot-msg"><strong>[AI]:</strong> ${formattedMsg}</div>`;
            }

        } catch (error) {
            console.error("Error de conexión:", error);
            chatBox.innerHTML += `<div class="bot-msg" style="color:red;"><strong>[ERROR]:</strong> No se pudo conectar con el bot.</div>`;
        }

        chatBox.scrollTop = chatBox.scrollHeight;
    }
}












  
   let registros = [];
  let currentPage = 1;
  const rowsPerPage = 10;



const modal = document.getElementById("modal-log");
const modalTitulo = document.getElementById("modal-titulo");
const btnCerrar = document.getElementById("btn-cerrar");
const btnGraficas = document.getElementById("btn-graficas");

let archivoSeleccionado = "";

// Delegación de eventos (funciona aunque la tabla se cargue dinámicamente)
document.querySelector("#tabla-logs tbody")
.addEventListener("click", function(e) {

    const fila = e.target.closest("tr");
    if (!fila) return;

    // Primera columna = nombre del archivo
    archivoSeleccionado = fila.cells[0].innerText;

    modalTitulo.textContent = "Archivo seleccionado: " + archivoSeleccionado;
    modal.style.display = "flex";
});

btnCerrar.addEventListener("click", function() {
    modal.style.display = "none";
});

// Cerrar al hacer click fuera
modal.addEventListener("click", function(e) {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

btnGraficas.addEventListener("click", function() {
    console.log("Cargar gráficas para:", archivoSeleccionado);

    // 👉 Aquí llamas tu función real
    // ejemplo:
    // cargarGraficas(archivoSeleccionado);

    modal.style.display = "none";
});

//AQUI ESTAMOS PICANDO
const cargarDatosDesdeBD = async (nombreColeccion) => {
    try {
        console.log(`📡 Solicitando colección: ${nombreColeccion}...`);
        
        const response = await fetch(`/collection/${nombreColeccion}`);
        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const data = await response.json(); // data.registros tiene el array completo

        // 🛠️ Función para el alert (se mantiene como pediste)
        const construirFecha = (registro) => {
            if (!registro || !registro.Timestamp) return "Fecha no disponible";
            const ts = registro.Timestamp;
            return `${ts.Day}/${ts.Month}/20${ts.Year} ${ts.Hour}:${ts.Minute}:${ts.Second}`;
        };

        // --- A. ACTUALIZACIÓN DE CABECERA (Tags arriba) ---
        const fInicio = construirFecha(data.primerRegistro);
        const fFin = construirFecha(data.ultimoRegistro);

        document.getElementById("info-archivo").textContent = data.nombre;
        document.getElementById("info-cantidad").textContent = data.cantidad;
        document.getElementById("info-primer").textContent = fInicio;
        document.getElementById("info-ultimo").textContent = fFin;
        document.getElementById("info-fecha").textContent = fInicio;

        // --- B. ACTUALIZACIÓN DE TODO EL DASHBOARD (Tabla, Gráficos, Boya) ---
        // Aquí llamamos a una versión modificada de tu lógica que acepta datos externos
        actualizarTodoElDashboardConDatos(data.registros);

        // ✅ TU ALERT ESTRUCTURADO
        alert(
            `✅ ¡Archivo encontrado con éxito!\n\n` +
            `📂 Colección: "${data.nombre}"\n` +
            `🔢 Cantidad total: ${data.cantidad} registros\n` +
            `----------------------------------------\n` +
            `📅 Primer registro: ${fInicio}\n` +
            `📅 Último registro: ${fFin}\n` +
            `----------------------------------------\n` +
            `🆔 IDs: ${data.primerRegistro.n_registro} al ${data.ultimoRegistro.n_registro}`
        );

    } catch (error) {
        console.error("❌ Error:", error);
        alert("⚠️ No se pudo cargar la información.");
    }
};


function actualizarTodoElDashboardConDatos(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) return;

    // 1. Setear el último registro global para que las tarjetas se actualicen
    window.lastRecord = dataArray[dataArray.length - 1];

    // 2. Actualizar Tarjetas (Widgets)
    const lastHs = window.lastRecord.Hs ?? null;
    const lastTp = window.lastRecord.Tp ?? null;
    const lastDir = window.lastRecord.Dp ?? window.lastRecord.Dmean ?? null;
    const lastDep = window.lastRecord.Depth ?? null;

    document.getElementById("hsValue").textContent  = lastHs  ?? "--";
    document.getElementById("tpValue").textContent  = lastTp  ?? "--";
    document.getElementById("dirValue").textContent = lastDir ?? "--";
    document.getElementById("depValue").textContent = lastDep != null ? ((lastDep / 1000) - 19).toFixed(2) : "--";

    // 3. Boya 3D
    if (window.lastRecord?.Profile) {
        window.profileLevels = pickProfileLevels(window.lastRecord.Profile);
        actualizarBuoy();
    }

    // 4. Sincronizar con la variable GLOBAL 'registros'
    // IMPORTANTE: registros debe estar declarada arriba con 'let'
    registros = dataArray.slice().reverse(); // Invertimos para que el más nuevo esté arriba
    
    currentPage = 1;
    mostrarPagina(1); // Forzamos el redibujado de la tabla
    actualizarBotonesPaginacion();

    // 5. Preparar Gráficos (usando los últimos 144 registros del array original)
    // Tomamos los últimos 144, pero para el gráfico los queremos en orden cronológico (sin reverse)
    const ultimosRegistros = dataArray.slice(-144); 
    
    const labels = ultimosRegistros.map(r => {
        const ts = r.Timestamp;
        return `${String(ts.Hour).padStart(2, '0')}:${String(ts.Minute).padStart(2, '0')}`;
    });

    const dataHs = ultimosRegistros.map(r => r.Hs ?? 0);
    const dataTp = ultimosRegistros.map(r => r.Tp ?? 0);
    const dataDepth = ultimosRegistros.map(r => {
        const raw = r.Depth;
        return (typeof raw === 'number') ? (raw / 1000) - 20 : 0;
    });

    // Llamamos a tu función de Chart.js
    actualizarGraficos(labels, dataHs, dataTp, dataDepth);
    console.log("✅ Dashboard y Tabla actualizados con nuevos datos");
}



// 2. Modificación de tu evento del botón
btnGraficas.addEventListener("click", async function() {
    if (!archivoSeleccionado) {
        console.error("No hay ninguna colección seleccionada.");
        return;
    }

    console.log("🚀 Disparando petición para:", archivoSeleccionado);

    // Ejecutamos la función de carga
    await cargarDatosDesdeBD(archivoSeleccionado);

    // Cerramos el modal
    modal.style.display = "none";
});




  // =========================
  //  CHARTS
  // =========================


  let freezeBoya = false;






let chart1, chart2, chart3;
let highlightIndex = 0;           // índice global del punto resaltado (en los datos completos)
let viewStart = 0, viewEnd = 0;   // ventana visible [start, end] en datos completos
let zoomLevel = 0;                // 0 = vista completa, 1..N = zoom creciente

// Copias de los datos completos
let fullLabels = [];
let fullHs = [], fullTp = [], fullDepth = [];


function initCharts() {
  chart1 = new Chart(document.getElementById('chart1'), {
    type: 'line',
    data: {
      labels: Array(77).fill(0).map((_,i)=>"P"+(i+1)),
      datasets: [{
        label: "HS (M)",
        data: Array(77).fill(0),
        borderColor: "#007bff",
        backgroundColor: "rgba(0,123,255,0.2)",
        tension: 0.4, fill: true
      }]
    },
    options: baseChartOptions('ALTURA DE OLA SIGNIFICATIVA HS (M)')
  });

  chart2 = new Chart(document.getElementById('chart2'), {
    type: 'line',
    data: {
      labels: chart1.data.labels,
      datasets: [{
        label: "PERIODO PEAK (S)",
        data: Array(77).fill(0),
        borderColor: "#28a745",
        backgroundColor: "rgba(40,167,69,0.2)",
        tension: 0.4, fill: true
      }]
    },
    options: baseChartOptions('PERIODO PEAK (S)')
  });

  chart3 = new Chart(document.getElementById('chart3'), {
    type: 'line',
    data: {
      labels: chart1.data.labels,
      datasets: [{
        label: "ALTURA DE MAREA (M)",
        data: Array(77).fill(0),
        borderColor: "#dc3545",
        backgroundColor: "rgba(220,53,69,0.2)",
        tension: 0.4, fill: true
      }]
    },
    options: baseChartOptions('ALTURA DE MAREA (M NRS)')
  });

  // Guardar copias completas
  fullLabels = chart1.data.labels.slice();
  fullHs     = chart1.data.datasets[0].data.slice();
  fullTp     = chart2.data.datasets[0].data.slice();
  fullDepth  = chart3.data.datasets[0].data.slice();

  // Slider por índice (0..N-1), arrancar en el último
  const slider = document.getElementById("chartSlider");
  const total = fullLabels.length;
  slider.min = 0; slider.max = total - 1; slider.step = 1; slider.value = slider.max;
  highlightIndex = Number(slider.value);

  slider.addEventListener("input", () => {
    highlightIndex = Number(slider.value);
    applyZoom(); // redibuja respetando zoom actual
  });

  // Ventana inicial = vista completa
  viewStart = 0; viewEnd = total - 1;
  applyZoom();

  // Botones de zoom (añade estos IDs en tu HTML)
  const btnIn  = document.getElementById('zoomIn');
  const btnOut = document.getElementById('zoomOut');

  if (btnIn) {
    btnIn.addEventListener('click', () => {
      zoomLevel = Math.min(10, zoomLevel + 1); // tope 10 niveles
      applyZoom();
    });
  }
  if (btnOut) {
    btnOut.addEventListener('click', () => {
      zoomLevel = Math.max(0, zoomLevel - 1);
      applyZoom();
    });
  }
}


function baseChartOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false, // Vital para que respete el flexbox
    animation: false, // Desactivar para que el slider sea fluido al moverlo
    plugins: {
      legend: { display: false },
      title: { 
        display: true, 
        text: title, 
        color: '#fff', 
        font: { size: 13, weight: 'bold' },
        padding: { top: 5, bottom: 5 }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: { color: '#aaa', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      x: {
        ticks: { 
          color: '#aaa', 
          font: { size: 10 },
          maxTicksLimit: 8 // Evita que las etiquetas de tiempo se monten
        },
        grid: { display: false }
      }
    },
    elements: {
      point: {
        // Solo mostramos el punto si es el seleccionado por el slider
        radius: (ctx) => ((ctx.dataIndex + viewStart) === highlightIndex ? 6 : 0),
        backgroundColor: 'yellow'
      },
      line: { borderWidth: 2, tension: 0.3 }
    }
  };
}



function applyZoom() {
  const total = fullLabels.length;

  // Asegurar highlightIndex dentro de rango por si cambió el total
  if (highlightIndex > total - 1) highlightIndex = total - 1;
  if (highlightIndex < 0) highlightIndex = 0;

  if (zoomLevel === 0) {
    viewStart = 0; viewEnd = total - 1;
  } else {
    const span = Math.max(5, Math.floor(total / (2 ** zoomLevel))); // ancho de ventana
    let half  = Math.floor(span / 2);

    let s = highlightIndex - half;
    let e = s + span - 1;

    if (s < 0) { s = 0; e = Math.min(total - 1, s + span - 1); }
    if (e > total - 1) { e = total - 1; s = Math.max(0, e - span + 1); }

    viewStart = s; viewEnd = e;
  }

  // Aplicar recorte a los 3 charts
  const L = fullLabels.slice(viewStart, viewEnd + 1);
  chart1.data.labels = L;
  chart2.data.labels = L;
  chart3.data.labels = L;

  chart1.data.datasets[0].data = fullHs.slice(viewStart, viewEnd + 1);
  chart2.data.datasets[0].data = fullTp.slice(viewStart, viewEnd + 1);
  chart3.data.datasets[0].data = fullDepth.slice(viewStart, viewEnd + 1);

  chart1.update(); chart2.update(); chart3.update();
}




function updateCharts() {
  chart1.update();
  chart2.update();
  chart3.update();
}

// Si cambias los datos dinámicamente, mantén el slider sincronizado:
function actualizarGraficos(labels, dataHs, dataTp, dataDepth) {
  // Actualizar copias completas
  fullLabels = labels.slice();
  fullHs = dataHs.slice();
  fullTp = dataTp.slice();
  fullDepth = dataDepth.slice();

  // Reconfigurar slider y highlight
  const slider = document.getElementById("chartSlider");
  slider.min = 0;
  slider.max = fullLabels.length - 1;
  slider.step = 1;
  slider.value = slider.max;           // ir al último al recargar datos
  highlightIndex = Number(slider.value);

  // Reiniciar ventana con zoom actual alrededor del nuevo highlight
  applyZoom();
}



  // =========================
  //  THREE.JS - ESCENA
  // =========================
 let isMouseDown = false, mouseX = 0, mouseY = 0;
let targetRotationX = Math.PI / 3;  // 45° horizontal
let targetRotationY = Math.PI / 6;  // 30° vertical
  const container = document.getElementById('buoyContainer');
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x001D3D);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(6, 6, 6);  // Más alto y oblicuo
camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404040, 1);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0x70aaff, 0.5);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  // Fondo y agua
  const oceanFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7, 4, 4),
    new THREE.MeshPhongMaterial({ color: 0x003050, side: THREE.DoubleSide, shininess: 10 })
  );
  oceanFloor.rotation.x = -Math.PI / 2;
  oceanFloor.position.y = -3;
  scene.add(oceanFloor);


const dashedLinesGroup = new THREE.Group();

if (freezeBoya) {
scene.add(dashedLinesGroup);
}

function createDashedLineAtY(yPosition) {
  const directions = [
    new THREE.Vector3(0, 0, 1),   // Norte (+Z)
    new THREE.Vector3(0, 0, -1),  // Sur (−Z)
    new THREE.Vector3(1, 0, 0),   // Este (+X)
    new THREE.Vector3(-1, 0, 0)   // Oeste (−X)
  ];

  const group = new THREE.Group(); // Agrupa las 4 líneas

  directions.forEach(dir => {
    const start = new THREE.Vector3(0, yPosition, 0);
    const end = start.clone().add(dir.multiplyScalar(3)); // 3 unidades hacia la dirección

    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      linewidth: 1,
      scale: 1,
      dashSize: 0.2,
      gapSize: 0.1
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances(); // Importante para líneas punteadas
    group.add(line);
  });

  return group;
}






  const waterGeometry = new THREE.PlaneGeometry(6, 6, 20, 20);
  const waterMaterial = new THREE.MeshPhongMaterial({
    color: 0x1E90FF, transparent: true, opacity: 0.6, side: THREE.DoubleSide, shininess: 100, flatShading: true
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 3;
  scene.add(water);

function createCardinalSprite(letter, positionVec3) {
  const size = 256;
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  cvs.width = cvs.height = size;
  ctx.clearRect(0, 0, size, size);

  // 🔁 Inversión de Z para alinear con sistema marítimo
  const angleRad = Math.atan2(positionVec3.x, -positionVec3.z);
  let angleDeg = angleRad * 180 / Math.PI;
  angleDeg = (angleDeg + 360) % 360;

  // Texto y grados
  ctx.font = 'bold 180px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(letter, size / 2, size / 2);

  ctx.font = 'bold 36px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#aaffff';
  ctx.fillText(`${angleDeg.toFixed(1)}°`, size / 2, size / 2 + 100);

  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);

  const worldScale = 1.2;
  sprite.scale.set(worldScale, worldScale, 1);
  sprite.position.copy(positionVec3);
  scene.add(sprite);

  console.log(`🧭 Sprite "${letter}" creado en dirección ${angleDeg.toFixed(1)}°`);
}
createCardinalSprite('N', new THREE.Vector3(0, 0, -3.4)); // Z− ahora es Norte
createCardinalSprite('E', new THREE.Vector3(3.4, 0, 0));  // X+ es Este
createCardinalSprite('S', new THREE.Vector3(0, 0, 3.4));  // Z+ es Sur
createCardinalSprite('O', new THREE.Vector3(-3.4, 0, 0)); // X− es Oeste

  // Burbujas
  const bubbleCount = 50;
  const bubblesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(bubbleCount * 3);
  for (let i = 0; i < bubbleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  bubblesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const bubblesMaterial = new THREE.PointsMaterial({ color: 0xA0C8FF, size: 0.05, transparent: true, opacity: 0.3, depthWrite: false });
  const bubbles = new THREE.Points(bubblesGeometry, bubblesMaterial);
  scene.add(bubbles);

  // Boya
  const buoyGroup = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xff4444 }));
  sphere.position.y = 0.5; buoyGroup.add(sphere);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.7, 16), new THREE.MeshPhongMaterial({ color: 0xffff00 }));
  mast.position.y = 2.85; buoyGroup.add(mast);

  // Grupos para flechas y discos
  const arrowsGroup = new THREE.Group();
  const disksGroup  = new THREE.Group();
  buoyGroup.add(arrowsGroup);
  buoyGroup.add(disksGroup);

  // Posición de la boya en escena
  buoyGroup.position.y = -3;
  scene.add(buoyGroup);

  // Contenedor HUD (rosa y otros overlays)
  const indicatorsContainer = document.createElement('div');
  indicatorsContainer.style.position = 'absolute';
  indicatorsContainer.style.top = '0';
  indicatorsContainer.style.left = '0';
  indicatorsContainer.style.width = '100%';
  indicatorsContainer.style.height = '100%';
  indicatorsContainer.style.pointerEvents = 'none';
  container.appendChild(indicatorsContainer);

  // === HUD 2D: Rosa de vientos ============================
  let roseHud, roseCanvas, roseCtx;

  function createRoseHud() {
    if (!roseHud) {
      roseHud = document.createElement('div');
      roseHud.id = 'roseHud';
      Object.assign(roseHud.style, {
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        width: '160px',
        height: '160px',
        borderRadius: '12px',
        background: 'rgba(0, 29, 61, 0.65)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35) inset, 0 4px 10px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(2px)',
        pointerEvents: 'none',
        overflow: 'hidden'
      });

      roseCanvas = document.createElement('canvas');
      roseCanvas.id = 'roseCanvas';
      roseCanvas.style.transformOrigin = '50% 50%';

      roseHud.appendChild(roseCanvas);
      container.appendChild(roseHud);
const freezeContainer = document.createElement('div');
Object.assign(freezeContainer.style, {
  position: 'absolute',
  bottom: '12px',
  left: 'calc(12px + 160px + 8px)',
  height: '160px',
  display: 'flex',
  alignItems: 'flex-end',
  pointerEvents: 'auto',
  zIndex: '40'
});

// Wrapper interno para alineación más precisa
const freezeWrapper = document.createElement('div');
Object.assign(freezeWrapper.style, {
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.05)',
  padding: '6px 10px',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'system-ui, sans-serif',
  backdropFilter: 'blur(6px)',
  boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
});

const freezeCheckbox = document.createElement('input');
freezeCheckbox.type = 'checkbox';
freezeCheckbox.id = 'freezeCheckbox';
freezeCheckbox.style.margin = '0 6px 0 0';
freezeCheckbox.style.transform = 'scale(1.1)'; // Opcional: agranda un poco

const freezeLabel = document.createElement('label');
freezeLabel.htmlFor = 'freezeCheckbox';
freezeLabel.textContent = 'Centrar';
freezeLabel.style.lineHeight = '1';
freezeLabel.style.display = 'inline-block';







freezeCheckbox.addEventListener('change', () => {
  freezeBoya = freezeCheckbox.checked;

  if (freezeBoya) {
    buoyGroup.position.set(0, -3, 0);
    buoyGroup.rotation.set(0, 0, 0);
  }

  // 🔁 Vuelve a regenerar la escena de la boya según el nuevo estado del checkbox
  actualizarBuoy();
});









freezeWrapper.appendChild(freezeCheckbox);
freezeWrapper.appendChild(freezeLabel);
freezeContainer.appendChild(freezeWrapper);
container.appendChild(freezeContainer);
      roseCtx = roseCanvas.getContext('2d');
      resizeRoseCanvas();
    }
  }

  function resizeRoseCanvas() {
    if (!roseHud) return;
    const dpr = window.devicePixelRatio || 1;
    const w = roseHud.clientWidth;
    const h = roseHud.clientHeight;
    roseCanvas.width = Math.max(1, Math.floor(w * dpr));
    roseCanvas.height = Math.max(1, Math.floor(h * dpr));
    roseCanvas.style.width = w + 'px';
    roseCanvas.style.height = h + 'px';
    roseCtx.setTransform(1,0,0,1,0,0);
    roseCtx.scale(dpr, dpr);
  }

  function drawRose(vectors) {
    createRoseHud();
    const W = roseHud.clientWidth, H = roseHud.clientHeight;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(cx, cy) - 8;

    roseCtx.clearRect(0,0,W,H);

    for (let i = 5; i >= 1; i--) {
      const r = (R * i) / 5;
      roseCtx.beginPath();
      roseCtx.arc(cx, cy, r, 0, Math.PI * 2);
      roseCtx.fillStyle = `rgba(30, 90, 160, ${0.06 + (5 - i) * 0.05})`;
      roseCtx.fill();
    }

    roseCtx.strokeStyle = 'rgba(255,255,255,0.15)';
    roseCtx.lineWidth = 1;
    [['N', -90], ['E', 0], ['S', 90], ['O', 180]].forEach(([, ang]) => {
      const rad = ang * Math.PI / 180;
      roseCtx.beginPath();
      roseCtx.moveTo(cx, cy);
      roseCtx.lineTo(cx + R * Math.cos(rad), cy + R * Math.sin(rad));
      roseCtx.stroke();
    });
    roseCtx.font = 'bold 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    roseCtx.textAlign = 'center';
    roseCtx.textBaseline = 'middle';
    roseCtx.fillStyle = '#dfe9ff';
    // Corrección de letras cardinales: N arriba, S abajo, O derecha, E izquierda
roseCtx.fillText('S', cx, cy - R + 10); 
roseCtx.fillText('N', cx, cy + R - 10);
roseCtx.fillText('O', cx + R - 10, cy);  // Oeste a la derecha
roseCtx.fillText('E', cx - R + 10, cy);  // Este a la izquierda
    const MAG_TO_RADIUS = 0.9;
    function drawArrow(rad, mag, colorHex) {
      const color = '#' + colorHex.toString(16).padStart(6,'0');
      const len = (mag > 0 ? Math.min(R*0.9, Math.max(R*0.15, mag * R * MAG_TO_RADIUS)) : R*0.12);
      const x2 = cx + len * Math.cos(rad);
      const y2 = cy + len * Math.sin(rad);

      roseCtx.strokeStyle = color;
      roseCtx.lineWidth = 3;
      roseCtx.lineCap = 'round';
      roseCtx.beginPath();
      roseCtx.moveTo(cx, cy);
      roseCtx.lineTo(x2, y2);
      roseCtx.stroke();

      const head = Math.min(16, len * 0.25);
      const a = Math.atan2(y2 - cy, x2 - cx);
      const left = a + Math.PI - 0.5;
      const right = a + Math.PI + 0.5;
      roseCtx.beginPath();
      roseCtx.moveTo(x2, y2);
      roseCtx.lineTo(x2 + head * Math.cos(left),  y2 + head * Math.sin(left));
      roseCtx.lineTo(x2 + head * Math.cos(right), y2 + head * Math.sin(right));
      roseCtx.closePath();
      roseCtx.fillStyle = color;
      roseCtx.fill();

      roseCtx.beginPath();
      roseCtx.arc(cx, cy, 3, 0, Math.PI*2);
      roseCtx.fillStyle = 'rgba(255,255,255,0.8)';
      roseCtx.fill();
    }

    vectors.forEach(v => {
      const rad = (v.deg - 90) * Math.PI / 180;
      drawArrow(rad, v.magnitude ?? 0, v.colorHex ?? 0xff0000);
    });
  }

  function updateRoseFromArrowMeta() {
    const vecs = arrowMeta.map((m, i) => ({
      deg: m.azimuthDeg,
      magnitude: m.magnitude,
      colorHex: (i === 0) ? 0xff0000 : (i === 1 ? 0xffa500 : 0x00ff00)
    }));
    drawRose(vecs);
    updateRoseRotation();
  }

  // === HUD 2D: rotación según cámara ===
  function getCameraYawRad() {
    return Math.atan2(camera.position.x, camera.position.z);
  }
  function updateRoseRotation() {
    if (!roseCanvas) return;
    const yaw = getCameraYawRad();
 roseCanvas.style.transform = `rotate(${(yaw * 180 / Math.PI + 180)}deg)`;
  }

  // Globals
  window.lastRecord = null;
  window.profileLevels = null;
  let arrowMeta = [];

  // Helpers
  function getBinMagDir(bin) {
    if (!bin || typeof bin !== 'object') return { mag: 0, deg: 0 };
    const mag = Number(bin.Magnitude ?? bin.magnitude ?? 0);
    let deg   = Number(bin.Direction ?? bin.direction ?? 0);
    if (!isFinite(mag) || !isFinite(deg)) return { mag: 0, deg: 0 };
    deg = (deg % 360 + 360) % 360;
    return { mag, deg };
  }


  function degToDir3D(deg) {
  const rad = deg * Math.PI / 180;
  const x = Math.sin(rad);
  const z = -Math.cos(rad); // ← corregido: Z invertido
  return new THREE.Vector3(x, 0, z).normalize();
}


  function degToCompass8(deg) {
    const labels = ['N','NE','E','SE','S','SW','W','NW'];
    const idx = Math.round((deg % 360) / 45) % 8;
    return labels[idx];
  }

 // 3 niveles
const levelsMeters = [5.0, 3.0, 1.0];
const levelsTextMeters = [18.0, 22.0, 30.0];

function pickProfileLevels(profileArr) {
  if (!Array.isArray(profileArr) || profileArr.length === 0) return null;
  
  // Seleccionamos los bines 4, 8 y 10 (índices 3, 7 y 9)
  const b10 = profileArr[9]; 
  const b8  = profileArr[7];
  const b4  = profileArr[3];

  return { 
    first: b10, 
    mid: b8, 
    fiftyThree: b4, 
    indices: { first: 10, mid: 8, fiftyThree: 4 } 
  };
}

  // =========================
  //  ACTUALIZAR BOYA (flechas + tarjetas fijas)
  // =========================
  function actualizarBuoy() {
    try {
      //alert('🔧 Iniciando actualizarBuoy()…');

      // Limpiar anteriores
      while (arrowsGroup.children.length) arrowsGroup.remove(arrowsGroup.children[0]);
      while (disksGroup.children.length)  disksGroup.remove(disksGroup.children[0]);
      const prevFixed = document.getElementById('fixedTagsContainer');
      if (prevFixed) prevFixed.remove();
      arrowMeta = [];

      const profile = window.profileLevels;
      if (!profile) {
        alert('⚠️ No hay profileLevels. ¿lastRecord.Profile venía vacío?');
        drawRose([]);
        return;
      }

      const pv = [
        { bin: profile.first,       idx: profile.indices?.first ?? 53, depthMeters: levelsMeters[0], color: 0xff0000 },
        { bin: profile.mid,         idx: profile.indices?.mid ?? 27,   depthMeters: levelsMeters[1], color: 0xffa500 },
        { bin: profile.fiftyThree,  idx: profile.indices?.fiftyThree ?? 14, depthMeters: levelsMeters[2], color: 0x00ff00 }
      ];

      //alert(`📊 Bins seleccionados -> #${pv[0].idx}, #${pv[1].idx}, #${pv[2].idx}`);

      pv.forEach((entry, i) => {
        const { mag, deg } = getBinMagDir(entry.bin);
        const depthMeters = entry.depthMeters;
        const depthTextMeters = levelsTextMeters[i];

       // alert(`➡️ Bin #${entry.idx}: Mag=${mag.toFixed(3)}, Dir=${deg.toFixed(0)}°, Prof=${depthMeters} m`);

        const disk = new THREE.Mesh(
          new THREE.CircleGeometry(0.7, 64),
          new THREE.MeshBasicMaterial({ color: 0x007bff, opacity: 0.2, transparent: true, side: THREE.DoubleSide })
        );
        disk.rotation.x = -Math.PI / 2;
        disk.position.set(0, depthMeters, 0);
        disksGroup.add(disk);

        const dir3D = degToDir3D(deg);
        const gain = 15.0, minLen = 0.35, maxLen = 5.0;
        const length = Math.min(maxLen, Math.max(minLen, mag * gain));

        const origin = new THREE.Vector3(0, depthMeters, 0);
        const arrow = new THREE.ArrowHelper(dir3D, origin, length, entry.color, 0.3, 0.15);
        arrowsGroup.add(arrow);

        const compass = degToCompass8(deg);

        arrowMeta.push({
          originLocal: origin.clone(),
          dirLocal: dir3D.clone(),
          length,
          azimuthDeg: deg,
          compass,
          magnitude: mag,
          idx: entry.idx,
          depth: depthMeters,
          depthTextMeters
        });
      });












if (freezeBoya) {
  const ARC_Y_OFFSET = 3;

  // Reusar grupo si existe; si no, crearlo limpio
  let azimuthArcsGroup = scene.getObjectByName('azimuthArcsGroup');
  if (azimuthArcsGroup) {
    // si existía, lo limpiamos por si venimos de otro ciclo
    azimuthArcsGroup.traverse(obj => {
      if (obj.isLine) { obj.geometry.dispose(); obj.material.dispose(); }
      if (obj.isSprite) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    azimuthArcsGroup.clear();
  } else {
    azimuthArcsGroup = new THREE.Group();
    azimuthArcsGroup.name = 'azimuthArcsGroup';
    scene.add(azimuthArcsGroup);
  }

  arrowMeta.forEach((meta) => {
    const radius = 0.7;
    const segments = 32;
    const thetaStart = 0;
    const thetaEnd = THREE.MathUtils.degToRad(meta.azimuthDeg);
    const arcPoints = [];

    const steps = Math.ceil(segments * Math.abs(thetaEnd - thetaStart) / (2 * Math.PI));

    for (let i = 0; i <= steps; i++) {
      const theta = thetaStart + (i / steps) * (thetaEnd - thetaStart);
      arcPoints.push(new THREE.Vector3(
        radius * Math.sin(theta),
        meta.depth - ARC_Y_OFFSET,
        -radius * Math.cos(theta)
      ));
    }

    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      linewidth: 1,
      dashSize: 0.1,
      gapSize: 0.05,
      scale: 1
    });

    const arcLine = new THREE.Line(arcGeometry, arcMaterial);
    arcLine.computeLineDistances();
    azimuthArcsGroup.add(arcLine); // <-- agrupar arco

    const midDeg = meta.azimuthDeg / 2;
    const midRad = THREE.MathUtils.degToRad(midDeg);
    const extendedRadius = radius + 0.25;

    const labelPos = new THREE.Vector3(
      extendedRadius * Math.sin(midRad),
      meta.depth - ARC_Y_OFFSET + 0.05,
      -extendedRadius * Math.cos(midRad)
    );

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = `${meta.azimuthDeg.toFixed(0)}°`;
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 0.75, 1);
    sprite.position.copy(labelPos);

    azimuthArcsGroup.add(sprite); // <-- agrupar etiqueta también
  });

  // Asegurar en escena (si no estaba)
  if (!scene.children.includes(azimuthArcsGroup)) {
    scene.add(azimuthArcsGroup);
  }

  scene.add(dashedLinesGroup);

} else {
  // Eliminar dashedLinesGroup
  if (scene.children.includes(dashedLinesGroup)) {
    scene.remove(dashedLinesGroup);
  }

  // Eliminar grupo de arcos y liberar recursos
  const azimuthArcsGroup = scene.getObjectByName('azimuthArcsGroup');
  if (azimuthArcsGroup) {
    azimuthArcsGroup.traverse(obj => {
      if (obj.isLine) { obj.geometry.dispose(); obj.material.dispose(); }
      if (obj.isSprite) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    scene.remove(azimuthArcsGroup);
    azimuthArcsGroup.clear();
  }
}





























      // === Tarjetas tipo counter: columna fija a la derecha ===
      const fixedTagsContainer = document.createElement('div');
      fixedTagsContainer.id = 'fixedTagsContainer';
      Object.assign(fixedTagsContainer.style, {
        position: 'absolute',
        top: '50%',
transform: 'translateY(-50%)',           // ajusta según tu header/counters
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: '30',
        pointerEvents: 'none'   // evita capturar mouse sobre la escena
      });
      container.appendChild(fixedTagsContainer);

   arrowMeta.forEach((meta, i) => {
  const card = document.createElement('div');

  // Fondo translúcido con color distintivo
  const backgroundGradient = i === 0
    ? 'linear-gradient(to bottom right, rgba(255,0,0,0.6), rgba(255,0,0,0.2))'
    : i === 1
      ? 'linear-gradient(to bottom right, rgba(255,165,0,0.6), rgba(255,165,0,0.2))'
      : 'linear-gradient(to bottom right, rgba(0,255,0,0.6), rgba(0,255,0,0.2))';
//
  Object.assign(card.style, {
    padding: '10px 16px',
    backgroundImage: backgroundGradient,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    lineHeight: '1.5',
    maxWidth: '220px',
    pointerEvents: 'auto'
  });

card.innerHTML = `
  📍 <strong>Bin #${meta.idx}</strong>: ${meta.depthTextMeters} m<br>
  Dir: ${meta.azimuthDeg.toFixed(0)}° (${meta.compass})<br>
  Mag: ${(meta.magnitude * 2).toFixed(3)} (kn)
`;

  fixedTagsContainer.appendChild(card);
});


      // 👉 Actualiza la rosa 2D con los 3 vectores
      updateRoseFromArrowMeta();
// Elimina líneas anteriores si existen
while (dashedLinesGroup.children.length) {
  dashedLinesGroup.remove(dashedLinesGroup.children[0]);
}

// Crea línea blanca punteada hacia el norte para cada profundidad
arrowMeta.forEach(meta => {
  const line = createDashedLineAtY(meta.depth);
  dashedLinesGroup.add(line);
});


// 👇 Aquí va la línea que las baja
dashedLinesGroup.position.y = -3.0;
      //alert('✅ actualizarBuoy() completado');
    } catch (e) {
      console.error(e);
      alert('❌ Error en actualizarBuoy(): ' + e.message);
    }
  }

  // Animación escena
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);

    const radius = 10;
    camera.position.x = radius * Math.sin(targetRotationX) * Math.cos(targetRotationY);
    camera.position.y = radius * Math.sin(targetRotationY);
    camera.position.z = radius * Math.cos(targetRotationX) * Math.cos(targetRotationY);
    camera.lookAt(0, 0, 0);

    const pos = bubblesGeometry.attributes.position.array;
    for (let i = 0; i < bubbleCount; i++) {
      pos[i * 3 + 1] += 0.002 + Math.random() * 0.0015;
      if (pos[i * 3 + 1] > 3) pos[i * 3 + 1] = -3;
    }
    bubblesGeometry.attributes.position.needsUpdate = true;

    const time = clock.getElapsedTime();
    const vertices = waterGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const wave = 0.1 * Math.sin(x * 3 + time * 3);
      vertices.setZ(i, wave);
    }
    vertices.needsUpdate = true;
    waterGeometry.computeVertexNormals();
if (!freezeBoya) {
  buoyGroup.rotation.x = 0.05 * Math.sin(time * 2);
  buoyGroup.rotation.y = 0;
} else {
  buoyGroup.rotation.set(0, 0, 0); // Por si acaso lo reafirmamos
  buoyGroup.position.set(0, -3, 0); // Reafirma su posición exacta
}

    updateRoseRotation();
    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    resizeRoseCanvas();
    updateRoseFromArrowMeta();
    updateRoseRotation();
  });

  // Interacción mouse
  container.addEventListener('mousedown', (e) => { isMouseDown = true; mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('mouseup', () => { isMouseDown = false; });
  window.addEventListener('mousemove', (e) => {
    if (isMouseDown) {
      const dx = e.clientX - mouseX; const dy = e.clientY - mouseY;
      mouseX = e.clientX; mouseY = e.clientY;
      targetRotationX += dx * 0.005; targetRotationY += dy * 0.005;
      targetRotationY = Math.max(-Math.PI/2, Math.min(Math.PI/2, targetRotationY));
    }
  });


// 🌍 Variables globales para el último registro
let lastHs = null;
let lastTp = null;
let lastDir = null;
let lastDep = null;



  // =========================
  //  TABLA + CARGA DE REGISTROS
  // =========================
 


  function mostrarPagina(page) {
    const tbody = document.querySelector('#tabla-registros tbody');
    if (!tbody) {
      console.error('❌ No se encontró la tabla en el DOM');
      alert('❌ No se encontró la tabla en el DOM');
      return;
    }
    tbody.innerHTML = '';

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageItems = registros.slice(start, end);

    pageItems.forEach((registro, i) => {
      const ts = registro.Timestamp;
      const fecha = `${ts.Day}-${ts.Month}-${ts.Year}`;
      const hora = `${ts.Hour}:${ts.Minute}`;
      const hs = registro.Hs ?? '–';
      const tp = registro.Tp ?? '–';
      const dp = registro.Dp ?? '–';
      const depthRaw = registro.Depth;
      const depth = (typeof depthRaw === 'number') ? ((depthRaw / 1000) - 19).toFixed(2) : '–';
      const nRegistro = registro.n_registro ?? '–';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${nRegistro}</td>
        <td>${fecha}</td>
        <td>${hora}</td>
        <td>${hs}</td>
        <td>${tp}</td>
        <td>${dp}</td>
        <td>${depth}</td>
      `;
      tbody.appendChild(row);
    });

    document.getElementById('pageInfo').textContent = `Página ${page} de ${Math.ceil(registros.length / rowsPerPage)}`;
  }

  function actualizarBotonesPaginacion() {
    const totalPages = Math.ceil(registros.length / rowsPerPage);
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
  }

  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--; mostrarPagina(currentPage); actualizarBotonesPaginacion();
    }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(registros.length / rowsPerPage);
    if (currentPage < totalPages) {
      currentPage++; mostrarPagina(currentPage); actualizarBotonesPaginacion();
    }
  });

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM completamente cargado');
    initCharts();


    cargarRegistros();
  });


window.addEventListener('load', async () => {
    try {
        // 🔹 Pedimos las colecciones
        const response = await fetch('/allcollec');
        if (!response.ok) throw new Error('Error al obtener las colecciones');
        const colecciones = await response.json();

        const tbody = document.querySelector('#tabla-logs tbody');
        tbody.innerHTML = '';

        // 🔹 Función para extraer fecha del nombre del log
        function extraerFecha(nombreArchivo) {
            const match = nombreArchivo.match(/TS(\d{10})/);
            if (!match) return null; // no hay fecha
            const f = match[1];
            const anio = 2000 + Number(f.substring(0,2)); // YY → 2000+YY
            const mes  = Number(f.substring(2,4)) - 1;    // Mes 0-11
            const dia  = Number(f.substring(4,6));
            const hora = Number(f.substring(6,8));
            const min  = Number(f.substring(8,10));
            return new Date(anio, mes, dia, hora, min);
        }

        // 🔹 Construir filas y guardarlas en un array para ordenar
        const filas = colecciones.map(col => {
            const fechaObj = extraerFecha(col.nombre);
            const fechaStr = fechaObj
                ? `${String(fechaObj.getDate()).padStart(2,'0')}/${String(fechaObj.getMonth()+1).padStart(2,'0')}/${fechaObj.getFullYear()} ${String(fechaObj.getHours()).padStart(2,'0')}:${String(fechaObj.getMinutes()).padStart(2,'0')}`
                : '-';
            const cantidad = col.cantidad ?? '-';

            const tr = document.createElement('tr');
            tr.dataset.time = fechaObj ? fechaObj.getTime() : ''; // para ordenar
            tr.innerHTML = `<td>${col.nombre}</td><td>${fechaStr}</td><td>${cantidad}</td>`;
            return tr;
        });

        // 🔹 Ordenar filas por fecha (más reciente a más antigua)
        filas.sort((a,b) => {
            const tA = a.dataset.time ? Number(a.dataset.time) : 0;
            const tB = b.dataset.time ? Number(b.dataset.time) : 0;
            return tB - tA; // más reciente primero, fechas inválidas al final
        });

        // 🔹 Insertar filas ordenadas en la tabla
        filas.forEach(tr => tbody.appendChild(tr));

    } catch (err) {
        console.error('Error:', err.message);
    }
});






// Helper para formatear fechas del sistema (Timestamp objeto)
const formatSystemTS = (ts) => {
    if (!ts) return "---";
    const fechaObj = new Date(`20${ts.Year}`, parseInt(ts.Month) - 1, ts.Day, ts.Hour, ts.Minute, ts.Second || 0);
    return fechaObj.toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }).replace("a. m.", "am").replace("p. m.", "pm");
};

async function cargarRegistros() {
    const overlay = document.getElementById('loaderOverlay');
    const header  = document.getElementById('capsuleHeader');
    const body    = document.getElementById('capsuleBody');
    const footer  = document.getElementById('capsuleFooter');

    overlay.style.display = 'flex';
    footer.style.display = 'none';
    body.innerHTML = '<div class="loader-marine"></div><p style="margin-top:15px;">Consultando Colecciones y Registros...</p>';

    try {
        // 1. Ejecutar ambas peticiones en paralelo para mayor velocidad
        const [resRegistros, resCol] = await Promise.all([
            fetch('/registros'),
            fetch('/lastCollection')
        ]);

        if (!resRegistros.ok || !resCol.ok) throw new Error("Error en la comunicación con el servidor");

        const data = await resRegistros.json();
        const infoCol = await resCol.json();

        // --- PROCESAMIENTO DE REGISTROS (Tu lógica original) ---
        window.lastRecord = (Array.isArray(data) && data.length) ? data[data.length - 1] : null;
        
        if (window.lastRecord) {
            const lastHs  = window.lastRecord.Hs ?? "--";
            const lastTp  = window.lastRecord.Tp ?? "--";
            const lastDir = window.lastRecord.Dp ?? window.lastRecord.Dmean ?? "--";
            const lastDep = window.lastRecord.Depth ? ((window.lastRecord.Depth / 1000) - 19).toFixed(2) : "--";

            // Actualizar Tarjetas Principales
            document.getElementById("hsValue").textContent = lastHs;
            document.getElementById("tpValue").textContent = lastTp;
            document.getElementById("dirValue").textContent = lastDir;
            document.getElementById("depValue").textContent = lastDep;

            if (window.lastRecord.Profile) {
                window.profileLevels = pickProfileLevels(window.lastRecord.Profile);
                actualizarBuoy();
            }

            // Gráficos y Tabla
            registros = data.slice(-780).reverse();
            currentPage = 1;
            mostrarPagina(currentPage);
            actualizarBotonesPaginacion();
            
            const ultimos = registros.slice(0, 144).reverse();
            const labels = ultimos.map(r => `${String(r.Timestamp.Hour).padStart(2,'0')}:${String(r.Timestamp.Minute).padStart(2,'0')}`);
            actualizarGraficos(labels, ultimos.map(r => r.Hs ?? 0), ultimos.map(r => r.Tp ?? 0), ultimos.map(r => r.Depth ? (r.Depth/1000)-20 : 0));
        }

        // --- PROCESAMIENTO DE COLECCIÓN (La otra función) ---
        const nombreArchivo = infoCol.nombre || "No detectado";
        const fechaCrea = infoCol.fechaExtraida ? new Date(infoCol.fechaExtraida).toLocaleString('es-ES', {hour12:true}) : "---";
        const pReg = formatSystemTS(infoCol.primerRegistro?.Timestamp);
        const uReg = formatSystemTS(infoCol.ultimoRegistro?.Timestamp);
        const cant = infoCol.cantidad ?? 0;

        // Rellenar las casillas fijas del Dashboard (tu segunda función)
        document.getElementById("info-archivo").textContent = nombreArchivo;
        document.getElementById("info-fecha").textContent   = fechaCrea;
        document.getElementById("info-primer").textContent  = pReg;
        document.getElementById("info-ultimo").textContent  = uReg;
        document.getElementById("info-cantidad").textContent = cant;

        // --- ÉXITO: MOSTRAR REPORTE COMPLETO EN EL MODAL ---
        header.innerHTML = '<i class="bi bi-check-all"></i> REPORTE COMPLETO GENERADO';
        header.style.background = '#28a745';
        
        body.innerHTML = `
            <div class="capsule-filename-box">
                <span class="capsule-stat-label">Archivo Fuente:</span>
                <span class="capsule-filename-text">${nombreArchivo}</span>
            </div>
            <div class="capsule-stat-row"><span class="capsule-stat-label">Registros Totales:</span><span class="capsule-stat-value">${cant}</span></div>
            <div class="capsule-stat-row"><span class="capsule-stat-label">Desde (Primer R):</span><span class="capsule-stat-value">${pReg}</span></div>
            <div class="capsule-stat-row"><span class="capsule-stat-label">Hasta (Último R):</span><span class="capsule-stat-value">${uReg}</span></div>
            <hr style="margin:10px 0; border-top: 1px solid #ddd;">
            <div class="capsule-stat-row" style="border:none"><span class="capsule-stat-label">Altura de Ola (Hs):</span><span class="capsule-stat-value" style="font-size:16px;">${window.lastRecord?.Hs ?? '--'} m</span></div>
            <p style="font-size:11px; color:#28a745; margin-top:10px;">Sistema actualizado y sincronizado correctamente.</p>
        `;
        footer.style.display = 'block';

    } catch (error) {
        header.innerText = 'ERROR EN REPORTE';
        header.style.background = '#dc3545';
        body.innerHTML = `<i class="bi bi-x-circle" style="font-size:40px; color:#dc3545;"></i><p style="margin-top:15px;">${error.message}</p>`;
        footer.style.display = 'block';
    }
}

function cerrarCapsula() {
    document.getElementById('loaderOverlay').style.display = 'none';
}

// Iniciar al cargar
document.addEventListener("DOMContentLoaded", cargarRegistros);
