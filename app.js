const personas = ["Gonza", "Gian", "Mario", "Alexander", "Manu", "Mati", "JP", "Juanito", "Fabi", "Tata"];

const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbx_uOlIFuV3QwTya9dGSTPzBF9kDFmSinrIFxXXgcLyVLGu49ytiGaSvAPvJ8nvzrjn/exec";

const detallesAseo = {
  "Living comedor y baño": "• Ordenar, barrer y trapear.<br>• Sacar cenizas.<br>• Limpiar baños completos con cloro.",
  "Sala estudio y baños": "• Ordenar sala.<br>• Barrer y trapear.<br>• Limpiar baños."
};

const base = {
  "Lunes": [{ nombre: "Living comedor y baño", responsable: "Gonza" }, { nombre: "Sala estudio y baños", responsable: "Mati" }],
  "Martes": [{ nombre: "Living comedor y baño", responsable: "Gian" }, { nombre: "Sala estudio y baños", responsable: "JP" }],
  "Miércoles": [{ nombre: "Living comedor y baño", responsable: "Mario" }, { nombre: "Sala estudio y baños", responsable: "Juanito" }],
  "Jueves": [{ nombre: "Living comedor y baño", responsable: "Alexander" }, { nombre: "Sala estudio y baños", responsable: "Fabi" }],
  "Viernes": [{ nombre: "Living comedor y baño", responsable: "Manu" }, { nombre: "Sala estudio y baños", responsable: "Tata" }]
};

let data = JSON.parse(localStorage.getItem("app")) || { tareas: {}, evidencias: [], insumos: [] };

function guardar() {
  localStorage.setItem("app", JSON.stringify(data));
}

// 🔥 TOAST
function toast(msg, color = "#2ecc71") {
  const t = document.createElement("div");
  t.innerText = msg;
  t.style = `
    position:fixed; bottom:20px; right:20px;
    background:${color}; color:white;
    padding:12px 18px; border-radius:10px;
    z-index:999; font-weight:bold;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// 🔥 COMPRESIÓN
async function comprimirImagen(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const size = 400;
        canvas.width = size;
        canvas.height = (img.height * size) / img.width;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.4).split(",")[1]);
      };
    };
  });
}

// 🔥 PREVIEW (SOLO NOMBRES)
function previewImagen(input, id) {
  const cont = document.getElementById("preview_" + id);
  cont.innerHTML = "";

  [...input.files].forEach(file => {
    const div = document.createElement("div");
    div.textContent = "📎 " + file.name;
    div.style = "font-size: 14px; margin-top: 5px;";
    cont.appendChild(div);
  });
}

// 🔥 HOY
function renderHoy() {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const diaNombre = dias[new Date().getDay()];
  const cont = document.getElementById("mainContent");

  document.getElementById("titulo").innerText = "Hoy (" + diaNombre + ")";
  cont.innerHTML = "";

  if (!base[diaNombre]) {
    cont.innerHTML = "<div class='card'>No hay tareas 😎</div>";
    return;
  }

  // 🔧 FIX IMPORTANTE (NO BORRAR DATOS)
  if (!data.tareas[diaNombre]) {
    data.tareas[diaNombre] = base[diaNombre].map(t => ({ ...t, estado: "pendiente" }));
    guardar();
  }

  data.tareas[diaNombre].forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "tarea";

    div.innerHTML = `
      <h3>${t.nombre}</h3>
      <div class="checklist">${detallesAseo[t.nombre]}</div>

      <select id="sel_${i}"></select>

      <input type="file" id="f_${i}" accept="image/*" multiple>

      <div id="preview_${i}" style="margin-top:10px;"></div>

      <button id="btn_${i}" class="btn-confirmar"></button>
    `;

    cont.appendChild(div);

    const select = document.getElementById("sel_" + i);

    personas.forEach(p => {
      const op = document.createElement("option");
      op.value = p;
      op.text = p;
      if (p === t.responsable) op.selected = true;
      select.appendChild(op);
    });

    select.onchange = () => {
      t.responsable = select.value;
      guardar();
    };

    const fileInput = document.getElementById("f_" + i);
    fileInput.onchange = () => previewImagen(fileInput, i);

    const btn = document.getElementById("btn_" + i);

    btn.innerText = t.estado === "hecho" ? "✅ Enviado" : "🚀 Enviar";

    btn.onclick = async () => {
      if (!fileInput.files.length) {
        return toast("Sube al menos una imagen", "#e74c3c");
      }

      btn.innerText = "⏳ Subiendo...";
      btn.disabled = true;

      try {
        const imagenes = [];

        for (let file of fileInput.files) {
          const img64 = await comprimirImagen(file);
          imagenes.push(img64);
        }

        const fd = new FormData();
        fd.append("dia", diaNombre);
        fd.append("tarea", t.nombre);
        fd.append("responsable", t.responsable);
        fd.append("imgs", JSON.stringify(imagenes));

        fetch(GOOGLE_URL, {
          method: "POST",
          mode: "no-cors",
          body: fd
        });

        t.estado = "hecho";

        data.evidencias.unshift({
          tarea: t.nombre,
          responsable: t.responsable,
          fecha: new Date().toLocaleString()
        });

        guardar();

        btn.innerText = "✅ Enviado";
        toast("Evidencias subidas 🚀");

      } catch (err) {
        console.error(err);
        toast("Error al subir", "#e74c3c");
        btn.disabled = false;
        btn.innerText = "Reintentar";
      }
    };
  });
}

// 🔥 REGISTRO
function renderRegistro() {
  const cont = document.getElementById("mainContent");
  document.getElementById("titulo").innerText = "Registro";

  cont.innerHTML = "";

  data.evidencias.slice(0, 20).forEach(e => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `
      <b>${e.tarea}</b><br>
      ${e.responsable}<br>
      <small>${e.fecha}</small>
    `;
    cont.appendChild(d);
  });
}

// 🔥 VISTAS
function cargarVista(v, el) {
  document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
  if (el) el.classList.add("active");

  if (v === "hoy") renderHoy();
  if (v === "evidencias") renderRegistro();
}

// 🔥 INIT
window.onload = () => {
  cargarVista("hoy");

  setInterval(() => {
    document.getElementById("hora").innerText = new Date().toLocaleTimeString();
  }, 1000);
};