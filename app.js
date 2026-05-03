const personas = ["Gonza","Gian","Mario","Alexander","Manu","Mati","JP","Juanito","Fabi","Tata"];

const GOOGLE_URL = "https://script.google.com/macros/s/AKfycby-Cg7XVD7v3e4UfSRcKTo7GhaFf5skMnVN2G3qKK-GtxbiAjYGQqy4FPqUYt5vznxP/exec";

const base = {
  "Lunes":[
    {nombre:"Living comedor y baño",responsable:"Gonza"},
    {nombre:"Sala estudio y baños",responsable:"Mati"}
  ],
  "Martes":[
    {nombre:"Living comedor y baño",responsable:"Gian"},
    {nombre:"Sala estudio y baños",responsable:"JP"}
  ],
  "Miércoles":[
    {nombre:"Living comedor y baño",responsable:"Mario"},
    {nombre:"Sala estudio y baños",responsable:"Juanito"}
  ],
  "Jueves":[
    {nombre:"Living comedor y baño",responsable:"Alexander"},
    {nombre:"Sala estudio y baños",responsable:"Fabi"}
  ],
  "Viernes":[
    {nombre:"Living comedor y baño",responsable:"Manu"},
    {nombre:"Sala estudio y baños",responsable:"Tata"}
  ]
};

let data = JSON.parse(localStorage.getItem("app")) || {
  tareas:{},
  evidencias:[],
  faltas:{}
};

function guardar(){
  localStorage.setItem("app", JSON.stringify(data));
}

function getDia(){
  return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date().getDay()];
}

function initDia(){
  const dia = getDia();
  if(!base[dia]) return;

  if(!data.tareas[dia]){
    data.tareas[dia] = base[dia].map(t => ({
      ...t,
      responsableOriginal: t.responsable,
      estado:"pendiente",
      aviso:false
    }));
    guardar();
  }
}

// 🔥 COMPRESIÓN
function comprimirImagen(file){
  return new Promise(resolve=>{
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = e=>{
      const img = new Image();
      img.src = e.target.result;

      img.onload = ()=>{
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const size = 500;
        canvas.width = size;
        canvas.height = img.height * size / img.width;

        ctx.drawImage(img,0,0,canvas.width,canvas.height);

        resolve(canvas.toDataURL("image/jpeg",0.5).split(",")[1]);
      };
    };
  });
}

// 🔥 TOAST BONITO
function toast(msg,color="#2ecc71"){
  const t=document.createElement("div");
  t.innerText=msg;
  t.style=`
    position:fixed; bottom:20px; right:20px;
    background:${color}; color:white;
    padding:12px 18px; border-radius:10px;
    font-weight:bold; z-index:999;
  `;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

// 🔥 VISTA HOY
function renderHoy(){
  initDia();
  const cont=document.getElementById("mainContent");
  cont.innerHTML="";

  const dia=getDia();
  const tareas=data.tareas[dia];

  if(!tareas){
    cont.innerHTML="<h2>No hay aseo 😎</h2>";
    return;
  }

  const hora=new Date().getHours();

  tareas.forEach((t,i)=>{
    const div=document.createElement("div");
    div.className="tarea";

    div.innerHTML=`
      <h3>${t.nombre}</h3>

      <select id="sel_${i}"></select>

      <input type="file" id="file_${i}" multiple accept="image/*">

      <div id="preview_${i}" style="display:flex; gap:5px; margin-top:10px;"></div>

      <button id="btn_${i}" class="btn-confirmar">🚀 Enviar</button>
    `;

    cont.appendChild(div);

    // SELECT
    const sel=document.getElementById("sel_"+i);
    personas.forEach(p=>{
      const op=document.createElement("option");
      op.value=p;
      op.text=p;
      if(p===t.responsable) op.selected=true;
      sel.appendChild(op);
    });

    sel.onchange=()=>{
      t.responsable=sel.value;
      guardar();
    };

    // PREVIEW REAL 🔥
    const input=document.getElementById("file_"+i);
    input.onchange=()=>{
      const contPrev=document.getElementById("preview_"+i);
      contPrev.innerHTML="";

      [...input.files].forEach(file=>{
        const img=document.createElement("img");
        img.src=URL.createObjectURL(file);
        img.style="width:60px;height:60px;border-radius:8px;object-fit:cover;";
        contPrev.appendChild(img);
      });
    };

    // BOTÓN
    const btn=document.getElementById("btn_"+i);

    btn.onclick=async()=>{
      if(!input.files.length){
        return toast("Sube imágenes", "#e74c3c");
      }

      btn.innerText="⏳ Subiendo...";
      btn.disabled=true;

      try{
        const imgs=[];

        for(let file of input.files){
          const img64=await comprimirImagen(file);
          imgs.push(img64);
        }

        const fd=new FormData();
        fd.append("dia",dia);
        fd.append("tarea",t.nombre);
        fd.append("responsable",t.responsable);
        fd.append("imgs",JSON.stringify(imgs));

        fetch(GOOGLE_URL,{
          method:"POST",
          mode:"no-cors",
          body:fd
        });

        t.estado="hecho";

        data.evidencias.unshift({
          tarea:t.nombre,
          responsable:t.responsable,
          fecha:new Date().toLocaleString()
        });

        guardar();

        btn.innerText="✅ Enviado";
        toast("Subido 🚀");

      }catch(e){
        toast("Error","#e74c3c");
        btn.disabled=false;
        btn.innerText="Reintentar";
      }
    };
  });
}

// 🔥 REGISTRO
function renderEvidencias(){
  const cont=document.getElementById("mainContent");
  cont.innerHTML="<h2>📸 Registro</h2>";

  data.evidencias.forEach(e=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`
      <b>${e.tarea}</b><br>
      ${e.responsable}<br>
      <small>${e.fecha}</small>
    `;
    cont.appendChild(d);
  });
}

// 🔥 NAV
function cargarVista(v,el){
  document.querySelectorAll(".menu-item").forEach(i=>i.classList.remove("active"));
  if(el) el.classList.add("active");

  if(v==="hoy") renderHoy();
  if(v==="evidencias") renderEvidencias();
}

// INIT
window.onload=()=>{
  cargarVista("hoy");

  setInterval(()=>{
    document.getElementById("hora").innerText=new Date().toLocaleTimeString();
  },1000);
};
