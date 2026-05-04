const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbx_uOlIFuV3QwTya9dGSTPzBF9kDFmSinrIFxXXgcLyVLGu49ytiGaSvAPvJ8nvzrjn/exec";

const personas = ["Gonza","Gian","Mario","Alexander","Manu","Mati","JP","Juanito","Fabi","Tata"];

const base = {
  "Lunes":[{nombre:"Living comedor y baño", responsable:"Gonza"}],
  "Martes":[{nombre:"Sala estudio y baños", responsable:"Gian"}],
  "Miércoles":[{nombre:"Living comedor y baño", responsable:"Mario"}],
  "Jueves":[{nombre:"Sala estudio y baños", responsable:"Alexander"}],
  "Viernes":[{nombre:"Living comedor y baño", responsable:"Manu"}]
};

// 🔥 STORAGE
let data = JSON.parse(localStorage.getItem("app")) || {};
data.tareas = data.tareas || {};
data.historial = data.historial || [];
data.faltas = data.faltas || [];

// 🔁 RESET DIARIO
const hoyKey = new Date().toDateString();
if (!data.ultimoDia || data.ultimoDia !== hoyKey) {
  data.tareas = {};
  data.ultimoDia = hoyKey;
  guardar();
}

function guardar(){
  localStorage.setItem("app", JSON.stringify(data));
}

function toast(msg, color="#000"){
  const t=document.createElement("div");
  t.innerText=msg;
  t.style=`position:fixed;bottom:20px;right:20px;background:${color};color:#fff;padding:10px;border-radius:10px;z-index:999`;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2000);
}

function hoyNombre(){
  return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date().getDay()];
}

// 🔄 base64
function convertirBase64(file){
  return new Promise((res)=>{
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => res(reader.result.split(",")[1]);
  });
}

// 🏠 HOY
function renderHoy(){
  const dia = hoyNombre();
  const cont = document.getElementById("contenido");
  document.getElementById("titulo").innerText = "Hoy ("+dia+")";
  cont.innerHTML = "";

  if(!base[dia]){
    cont.innerHTML = "<div class='card'>Sin tareas 😎</div>";
    return;
  }

  if(!data.tareas[dia]){
    data.tareas[dia] = base[dia].map(t => ({...t, estado:"pendiente"}));
    guardar();
  }

  data.tareas[dia].forEach((t,i)=>{

    const div=document.createElement("div");
    div.className="card";

    div.innerHTML=`
      <h3>${t.nombre}</h3>
      <select id="sel_${i}"></select>
      <input type="file" id="file_${i}" multiple>
      <div id="preview_${i}"></div>
      <button id="btn_${i}">
        ${t.estado==='hecho'?'✅ Listo':'🚀 Enviar'}
      </button>
    `;

    cont.appendChild(div);

    const sel=document.getElementById("sel_"+i);
    personas.forEach(p=>{
      const op=document.createElement("option");
      op.value=p;
      op.text=p;
      if(p===t.responsable) op.selected=true;
      sel.appendChild(op);
    });

    sel.onchange=()=>{ t.responsable=sel.value; guardar(); };

    const file=document.getElementById("file_"+i);
    file.onchange=()=>{
      const prev=document.getElementById("preview_"+i);
      prev.innerHTML="";
      [...file.files].forEach(f=>{
        const img=document.createElement("img");
        img.className="preview";
        img.src=URL.createObjectURL(f);
        prev.appendChild(img);
      });
    };

    document.getElementById("btn_"+i).onclick = async () => {

      if(!file.files.length){
        return toast("Sube al menos una imagen","#e74c3c");
      }

      const btn = document.getElementById("btn_"+i);
      btn.innerText = "⏳ Subiendo...";
      btn.disabled = true;

      try {
        const imagenes = [];
        for (let f of file.files) {
          const base64 = await convertirBase64(f);
          imagenes.push(base64);
        }

        // Cambiamos a text/plain para evitar el error de CORS que bloquea las fotos
        const res = await fetch(GOOGLE_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" }, 
          body: JSON.stringify({
            dia,
            tarea: t.nombre,
            responsable: t.responsable,
            imgs: imagenes
          })
        });

        const dataRes = await res.json();

        if(dataRes.ok){
          t.estado="hecho";
          guardar();
          renderHoy();
          toast("Subido a Drive 🚀","#2ecc71");
        } else {
          throw new Error(dataRes.error || "Error en el servidor");
        }

      } catch(err){
        console.error(err);
        toast("Error al subir","#e74c3c");
        btn.disabled=false;
        btn.innerText="Reintentar";
      }
    };
  });
}

// 📸 HISTORIAL
function renderHistorial(){
  const cont=document.getElementById("contenido");
  document.getElementById("titulo").innerText="Historial";
  cont.innerHTML="";

  data.historial.forEach(h=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`
      <b>${h.tarea}</b><br>
      ${h.responsable}<br>
      <small>${h.fecha}</small>
    `;
    cont.appendChild(d);
  });
}

// 🔐 ADMIN
function abrirAdmin(){

  const modal=document.createElement("div");
  modal.className="modal";

  modal.innerHTML=`
    <div class="modal-box">
      <h3>Admin</h3>
      <input type="password" id="pass" placeholder="Contraseña">
      <button id="btnLogin">Entrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("btnLogin").onclick = ()=>{
    const pass=document.getElementById("pass").value;

    if(pass==="casafenix.cco"){
      modal.remove();
      renderAdmin();
    }else{
      toast("Incorrecta","#e74c3c");
    }
  };
}

// 🔧 ADMIN
function renderAdmin(){
  const cont=document.getElementById("contenido");
  document.getElementById("titulo").innerText="Admin";

  cont.innerHTML=`
    <h3>Agregar falta</h3>
    <select id="personaFalta"></select>
    <input id="motivo" placeholder="Motivo">
    <input id="obs" placeholder="Observación">
    <button id="btnFalta">Guardar falta</button>

    <h3>Faltas</h3>
    <div id="listaFaltas"></div>
  `;

  personas.forEach(p=>{
    const op=document.createElement("option");
    op.value=p;
    op.text=p;
    document.getElementById("personaFalta").appendChild(op);
  });

  document.getElementById("btnFalta").onclick = guardarFalta;

  renderFaltas();
}

// 🔴 FALTAS
async function guardarFalta() {
  const persona = document.getElementById("personaFalta").value;
  const motivo = document.getElementById("motivo").value;
  const obs = document.getElementById("obs").value;
  const btn = document.getElementById("btnFalta");

  if (!motivo) return toast("Escribe motivo", "#e74c3c");

  // Bloquear botón y mostrar carga
  btn.innerText = "⏳ Guardando...";
  btn.disabled = true;

  try {
    // Usamos mode: 'no-cors' y Content-Type: 'text/plain' para saltar restricciones de navegador
    await fetch(GOOGLE_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        tipo: "falta",
        persona,
        motivo,
        obs
      })
    });

    // Como usamos 'no-cors', el navegador no nos deja leer la respuesta (dataRes.ok),
    // pero si el fetch no lanza error, asumimos que se envió correctamente.
    data.faltas.unshift({
      persona,
      motivo,
      obs,
      fecha: new Date().toLocaleString()
    });

    guardar();
    renderFaltas();

    // Limpiar formulario
    document.getElementById("motivo").value = "";
    document.getElementById("obs").value = "";
    toast("Falta enviada 📄", "#2ecc71");

  } catch (err) {
    console.error("Error de red:", err);
    toast("Error de conexión", "#e74c3c");
  } finally {
    // Restaurar botón
    btn.innerText = "Guardar falta";
    btn.disabled = false;
  }
}
// 📋 FALTAS
function renderFaltas(){
  const cont=document.getElementById("listaFaltas");
  cont.innerHTML="";

  data.faltas.forEach((f,i)=>{
    const d=document.createElement("div");
    d.className="card";

    d.innerHTML=`
      <b>${f.persona}</b><br>
      ${f.motivo}<br>
      ${f.obs||""}<br>
      <small>${f.fecha}</small>
      <button onclick="eliminarFalta(${i})">❌</button>
    `;

    cont.appendChild(d);
  });
}

function eliminarFalta(i){
  if(confirm("Eliminar?")){
    data.faltas.splice(i,1);
    guardar();
    renderFaltas();
  }
}

// 🌗 TEMA
function toggleTema(){
  document.body.classList.toggle("dark");
}

// 📱 NAV
function cargarVista(v){
  if(v==="hoy") renderHoy();
  if(v==="historial") renderHistorial();
}

// 🔥 INIT
document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("navHoy").onclick = ()=>cargarVista("hoy");
  document.getElementById("navHistorial").onclick = ()=>cargarVista("historial");
  document.getElementById("navTema").onclick = toggleTema;
  document.getElementById("navAdmin").onclick = abrirAdmin;

  renderHoy();
});
