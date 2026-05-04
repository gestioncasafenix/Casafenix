const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbx_uOlIFuV3QwTya9dGSTPzBF9kDFmSinrIFxXXgcLyVLGu49ytiGaSvAPvJ8nvzrjn/exec";

const personas = ["Gonza","Gian","Mario","Alexander","Manu","Mati","JP","Juanito","Fabi","Tata"];

const base = {
  "Lunes": [
    { nombre: "Living comedor y baño", responsable: "Gonza" },
    { nombre: "Sala estudio y baños", responsable: "Mati" }
  ],
  "Martes": [
    { nombre: "Living comedor y baño", responsable: "Manu" },
    { nombre: "Sala estudio y baños", responsable: "JP" }
  ],
  "Miércoles": [
    { nombre: "Living comedor y baño", responsable: "Mario" },
    { nombre: "Sala estudio y baños", responsable: "Juanito" }
  ],
  "Jueves": [
    { nombre: "Living comedor y baño", responsable: "Alexander" },
    { nombre: "Sala estudio y baños", responsable: "Fabi" }
  ],
  "Viernes": [
    { nombre: "Living comedor y baño", responsable: "Manu" },
    { nombre: "Sala estudio y baños", responsable: "Tata" }
  ]
};

// 🔥 STORAGE
let data = JSON.parse(localStorage.getItem("app")) || {};
data.tareas = data.tareas || {};
data.historial = data.historial || [];
data.faltas = data.faltas || [];

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
  t.style=`position:fixed;bottom:80px;right:20px;background:${color};color:#fff;padding:10px;border-radius:10px;z-index:9999`;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2000);
}

function hoyNombre(){
  return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date().getDay()];
}

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
      <input type="file" id="file_${i}" multiple accept="image/*">
      <div id="preview_${i}"></div>
      <button id="btn_${i}" style="background: ${t.estado==='hecho'?'#2ecc71':'#28a745'}">
        ${t.estado==='hecho'?'✅ Listo':'🚀 Enviar'}
      </button>
    `;
    cont.appendChild(div);

    const sel=document.getElementById("sel_"+i);
    personas.forEach(p=>{
      const op=document.createElement("option");
      op.value=p; op.text=p;
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
      if(!file.files.length) return toast("Sube al menos una imagen","#e74c3c");
      
      const btn = document.getElementById("btn_"+i);
      btn.innerText = "⏳ Subiendo...";
      btn.disabled = true;

      try {
        const imagenes = [];
        for (let f of file.files) {
          const base64 = await convertirBase64(f);
          imagenes.push(base64);
        }

        await fetch(GOOGLE_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" }, 
          body: JSON.stringify({
            dia,
            tarea: t.nombre,
            responsable: t.responsable,
            imgs: imagenes
          })
        });

        t.estado="hecho";
        data.historial.unshift({
          tarea: t.nombre,
          responsable: t.responsable,
          fecha: new Date().toLocaleString()
        });
        guardar();
        renderHoy();
        toast("Subido a Drive 🚀","#2ecc71");
      } catch(err){
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
  if(data.historial.length === 0) cont.innerHTML = "<p>No hay registros aún.</p>";
  data.historial.forEach(h=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`<b>${h.tarea}</b><br>${h.responsable}<br><small>${h.fecha}</small>`;
    cont.appendChild(d);
  });
}

// 🔐 ADMIN LOGIN
function abrirAdmin(){
  const modal=document.createElement("div");
  modal.className="modal";
  modal.innerHTML=`
    <div class="modal-box">
      <h3>Acceso Admin</h3>
      <input type="password" id="pass" placeholder="Contraseña">
      <button id="btnLogin">Entrar</button>
      <button id="btnCerrarModal" style="background:#e74c3c; margin-top:10px;">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("btnLogin").onclick = ()=>{
    if(document.getElementById("pass").value === "casafenix.cco"){
      modal.remove();
      renderAdmin();
    } else {
      toast("Incorrecta","#e74c3c");
    }
  };
  document.getElementById("btnCerrarModal").onclick = () => modal.remove();
}

// 🔧 PANEL ADMIN
function renderAdmin(){
  const cont=document.getElementById("contenido");
  document.getElementById("titulo").innerText="Admin";
  cont.innerHTML=`
    <button id="btnVolverAdmin" style="background:#6c757d; margin-bottom:20px;">⬅ Volver a Inicio</button>
    <h3>Agregar falta</h3>
    <select id="personaFalta"></select>
    <input id="motivo" placeholder="Motivo">
    <input id="obs" placeholder="Observación">
    <button id="btnFalta">Guardar falta</button>
    <h3>Faltas</h3>
    <div id="listaFaltas"></div>
  `;

  document.getElementById("btnVolverAdmin").onclick = () => renderHoy();

  const sel = document.getElementById("personaFalta");
  personas.forEach(p=>{
    const op=document.createElement("option");
    op.value=p; op.text=p;
    sel.appendChild(op);
  });

  document.getElementById("btnFalta").onclick = guardarFalta;
  renderFaltas();
}

async function guardarFalta() {
  const persona = document.getElementById("personaFalta").value;
  const motivo = document.getElementById("motivo").value;
  const obs = document.getElementById("obs").value;
  if (!motivo) return toast("Escribe motivo", "#e74c3c");

  const btn = document.getElementById("btnFalta");
  btn.innerText = "⏳ Guardando...";
  btn.disabled = true;

  try {
    await fetch(GOOGLE_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ tipo: "falta", persona, motivo, obs })
    });
    data.faltas.unshift({ persona, motivo, obs, fecha: new Date().toLocaleString() });
    guardar();
    renderFaltas();
    document.getElementById("motivo").value = "";
    document.getElementById("obs").value = "";
    toast("Falta enviada 📄", "#2ecc71");
  } catch (err) {
    toast("Error de conexión", "#e74c3c");
  } finally {
    btn.innerText = "Guardar falta";
    btn.disabled = false;
  }
}

function renderFaltas(){
  const cont=document.getElementById("listaFaltas");
  cont.innerHTML="";
  data.faltas.forEach((f,i)=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`<b>${f.persona}</b><br>${f.motivo}<br><small>${f.fecha}</small><br>
      <button onclick="eliminarFalta(${i})" style="width:auto; padding:5px 10px; background:#e74c3c; margin-top:5px;">❌</button>`;
    cont.appendChild(d);
  });
}

function eliminarFalta(i){
  if(confirm("¿Eliminar?")){
    data.faltas.splice(i,1);
    guardar();
    renderFaltas();
  }
}

function toggleTema(){ document.body.classList.toggle("dark"); }

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("navHoy").onclick = () => renderHoy();
  document.getElementById("navHistorial").onclick = () => renderHistorial();
  document.getElementById("navTema").onclick = toggleTema;
  document.getElementById("navAdmin").onclick = abrirAdmin;
  renderHoy();
});
