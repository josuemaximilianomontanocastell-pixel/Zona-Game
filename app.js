// ====== CONFIGURACIÓN (cambia estos datos aquí) ======
const API_URL = "https://6af349bcd2377d6c3704d4b6.mockapi.io"; // URL base de tu MockAPI
const ADMIN = { user: "admin", pass: "1234" };                 // login por código
const NUM_DUENO = "64461580";                                  // número del dueño
const NUM_SOPORTE = "64461580";                                // número de soporte
const CORREO = "josuemaximilianomontanocastel@gmail.com";      // revisa que esté bien escrito
const wa = (num, msg) => `https://wa.me/591${num}?text=${encodeURIComponent(msg)}`;

let productos = [], categorias = [], editId = null, heroIdx = 0, heroN = 0;
let carrito = []; // [{ id, cant }]

const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PH = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%232a2f4d'/><text x='150' y='120' text-anchor='middle' font-size='64'>🎮</text></svg>";
// La tabla categorias puede tener el campo "nombre" o "monbre" (con el error de tipeo)
const cn = c => c.nombre ?? c.monbre ?? "";

function toast(m) { const t = $("#toast"); t.textContent = m; t.style.display = "block"; clearTimeout(t._t); t._t = setTimeout(() => t.style.display = "none", 2800); }

async function api(path, method = "GET", body) {
  const r = await fetch(API_URL + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

async function cargar() {
  try { productos = await api("/productos"); } catch (e) { productos = []; toast("No se pudieron cargar los productos"); }
  try { categorias = await api("/categorias"); } catch (e) { categorias = []; }
  renderTodo();
}

const listaCats = () => [...new Set([...categorias.map(cn), ...productos.map(p => p.categoria)])].filter(Boolean).sort();

function renderTodo() {
  renderHero(); renderCarruseles(); renderChips(); renderFiltro(); renderCatalogo();
  if (logueado()) renderAdmin();
}

// ====== NAVEGACIÓN ======
function ir(id) {
  vista("tienda");
  setTimeout(() => document.getElementById(id).scrollIntoView({ behavior: "smooth" }), 50);
}
function vista(v) {
  $("#tienda").classList.toggle("hide", v !== "tienda");
  $("#admin").classList.toggle("hide", v !== "admin");
  if (v === "admin") renderAdmin();
  window.scrollTo(0, 0);
}

// ====== TARJETA DE PRODUCTO ======
function card(p, conCantidad) {
  const st = Number(p.stock) || 0;
  const n = conCantidad ? `$('#n${p.id}').value` : "1";
  return `<div class="card">
    <img src="${esc(p.imagen)}" alt="" onerror="this.onerror=null;this.src=PH">
    <div class="b">
      <span class="cat">${esc(p.categoria)}</span>
      <strong>${esc(p.nombre)}</strong>
      <span class="price">Bs. ${Number(p.precio).toFixed(2)}</span>
      <span class="stock ${st <= 5 ? "low" : ""}">${st > 0 ? "Stock: " + st : "Agotado"}</span>
      <div class="buy">
        ${conCantidad ? `<input type="number" id="n${p.id}" value="1" min="1" max="${st}" ${st ? "" : "disabled"}>` : ""}
        <button onclick="agregar('${p.id}', ${n})" ${st ? "" : "disabled"}>🛒 Añadir</button>
      </div>
    </div></div>`;
}

// ====== BANNER PRINCIPAL ======
function renderHero() {
  const top = [...productos].filter(p => p.stock > 0).sort((a, b) => b.precio - a.precio).slice(0, 4);
  heroN = top.length;
  if (heroIdx >= heroN) heroIdx = 0;
  $("#heroSlides").innerHTML = top.length ? top.map((p, i) => `
    <div class="slide ${i === heroIdx ? "on" : ""}" style="background-image:url('${esc(p.imagen)}')">
      <div class="ov">
        <span class="cat">${esc(p.categoria)}</span>
        <h2>${esc(p.nombre)}</h2>
        <span class="price">Bs. ${Number(p.precio).toFixed(2)}</span>
        <div><button onclick="agregar('${p.id}',1)">Añadir al carrito</button>
        <button class="sec" onclick="ir('catalogo')">Ver catálogo</button></div>
      </div></div>`).join("")
    : `<div class="slide on"><div class="ov"><h2>Bienvenido a GameZone</h2><span>Los mejores videojuegos al mejor precio</span></div></div>`;
  $("#dots").innerHTML = top.map((_, i) => `<span class="${i === heroIdx ? "on" : ""}" onclick="slide(${i})"></span>`).join("");
}
function slide(i) {
  if (!heroN) return;
  heroIdx = (i + heroN) % heroN;
  document.querySelectorAll(".slide").forEach((s, k) => s.classList.toggle("on", k === heroIdx));
  document.querySelectorAll(".dots span").forEach((d, k) => d.classList.toggle("on", k === heroIdx));
}
setInterval(() => slide(heroIdx + 1), 5000);

// ====== CARRUSELES ======
function renderCarruseles() {
  const pop = [...productos].sort((a, b) => a.stock - b.stock).slice(0, 10);
  const nuevos = [...productos].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 10);
  $("#c1").innerHTML = pop.map(p => card(p, false)).join("") || "<p>Sin productos.</p>";
  $("#c2").innerHTML = nuevos.map(p => card(p, false)).join("") || "<p>Sin productos.</p>";
}
function mover(id, dir) {
  const t = document.getElementById(id);
  t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: "smooth" });
}

// ====== CATEGORÍAS, FILTRO Y CATÁLOGO ======
function renderChips() {
  $("#chips").innerHTML = listaCats().map(c => `<div class="chip" onclick="filtrar('${esc(c)}')">${esc(c)}</div>`).join("");
}
function filtrar(c) {
  $("#fcat").value = c; $("#q").value = "";
  renderCatalogo(); ir("catalogo");
}
function renderFiltro() {
  const s = $("#fcat"), v = s.value;
  s.innerHTML = `<option value="">Todas las categorías</option>` + listaCats().map(c => `<option>${esc(c)}</option>`).join("");
  s.value = v;
}
function renderCatalogo() {
  const q = $("#q").value.toLowerCase(), c = $("#fcat").value;
  const lista = productos.filter(p => (p.nombre || "").toLowerCase().includes(q) && (!c || p.categoria === c));
  $("#grid").innerHTML = lista.length ? lista.map(p => card(p, true)).join("") : `<p>No hay videojuegos para mostrar.</p>`;
}

// ====== VENTANAS EMERGENTES ======
function abrir(html) { $("#mbox").innerHTML = html; $("#modal").classList.remove("hide"); }
function cerrar() { $("#modal").classList.add("hide"); }

function info(tipo) {
  if (tipo === "envios") abrir(`
    <h3>🚚 Envíos rápidos a todo el país</h3>
    <p>Para coordinar tu envío comunícate con el dueño:</p>
    <p class="num">📞 ${NUM_DUENO}</p>
    <a class="btnw" href="${wa(NUM_DUENO, "Hola, quiero coordinar un envío")}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
    <button class="sec" onclick="cerrar()">Cerrar</button>`);

  if (tipo === "soporte") abrir(`
    <h3>🎧 Soporte</h3>
    <p>Si no puedes contactarnos o no se pudo hacer tu compra, comunícate a este número de referencia:</p>
    <p class="num">📞 ${NUM_SOPORTE}</p>
    <a class="btnw" href="${wa(NUM_SOPORTE, "Hola, necesito soporte con mi compra")}" target="_blank" rel="noopener">Pedir ayuda por WhatsApp</a>
    <button class="sec" onclick="cerrar()">Cerrar</button>`);

  if (tipo === "pago") abrir(`
    <h3>🔒 Pago seguro</h3>
    <p>Paga con tu tarjeta de débito o crédito.</p>
    <div class="marcas"><b>VISA</b><b>Mastercard</b></div>
    <input id="tn" placeholder="Número de tarjeta" inputmode="numeric" maxlength="19"
      oninput="this.value=this.value.replace(/\\D/g,'').replace(/(.{4})/g,'$1 ').trim()">
    <input id="tt" placeholder="Nombre del titular">
    <div class="dos">
      <input id="tv" placeholder="MM/AA" inputmode="numeric" maxlength="5"
        oninput="let d=this.value.replace(/\\D/g,'');this.value=d.length>2?d.slice(0,2)+'/'+d.slice(2,4):d">
      <input id="tc" placeholder="CVV" type="password" inputmode="numeric" maxlength="3"
        oninput="this.value=this.value.replace(/\\D/g,'')">
    </div>
    <small>🔐 Demostración: los datos de la tarjeta no se envían ni se guardan.</small>
    <button onclick="pagar()">Pagar</button>
    <button class="sec" onclick="cerrar()">Cancelar</button>`);
}

function pagar() {
  const num = $("#tn").value.replace(/\s/g, "");
  if (num.length !== 16) return toast("El número de tarjeta debe tener 16 dígitos");
  if (!$("#tt").value.trim()) return toast("Escribe el nombre del titular");
  if (!/^\d{2}\/\d{2}$/.test($("#tv").value)) return toast("Fecha inválida (MM/AA)");
  if ($("#tc").value.length !== 3) return toast("El CVV debe tener 3 dígitos");
  cerrar();
  toast("✅ Pago realizado correctamente (demostración)");
}

// ====== CARRITO ======
function agregar(id, n) {
  const p = productos.find(x => x.id === id); n = parseInt(n);
  if (!n || n < 1) return toast("Cantidad inválida");
  const item = carrito.find(c => c.id === id), ya = item ? item.cant : 0;
  if (ya + n > p.stock) return toast("No hay stock suficiente");
  if (item) item.cant += n; else carrito.push({ id, cant: n });
  actualizarCarrito();
  toast(`🛒 Añadido: ${n} × ${p.nombre}`);
}

const totalItems = () => carrito.reduce((s, c) => s + c.cant, 0);
const totalPrecio = () => carrito.reduce((s, c) => s + c.cant * Number(productos.find(p => p.id === c.id)?.precio || 0), 0);
function actualizarCarrito() { $("#cartN").textContent = totalItems(); }

function verCarrito() {
  carrito = carrito.filter(c => productos.some(p => p.id === c.id));
  actualizarCarrito();
  if (!carrito.length) return abrir(`<h3>🛒 Tu carrito</h3><p>Todavía no añadiste nada.</p><button class="sec" onclick="cerrar()">Cerrar</button>`);
  const filas = carrito.map(c => {
    const p = productos.find(x => x.id === c.id);
    return `<div class="fila"><span>${c.cant} × ${esc(p.nombre)}</span><span>Bs. ${(c.cant * p.precio).toFixed(2)}</span>
      <button class="del" onclick="quitar('${c.id}')">×</button></div>`;
  }).join("");
  abrir(`<h3>🛒 Tu carrito (${totalItems()})</h3><div class="filas">${filas}</div>
    <p class="tot">Total: Bs. ${totalPrecio().toFixed(2)}</p>
    <button onclick="finalizar()">Finalizar compra</button>
    <button class="sec" onclick="vaciar()">Vaciar carrito</button>
    <button class="sec" onclick="cerrar()">Seguir comprando</button>`);
}

function quitar(id) { carrito = carrito.filter(c => c.id !== id); actualizarCarrito(); verCarrito(); }
function vaciar() { carrito = []; actualizarCarrito(); cerrar(); }

// Aquí se RESTA el stock en MockAPI
async function finalizar() {
  const total = totalPrecio();
  try {
    for (const c of carrito) {
      const p = productos.find(x => x.id === c.id);
      if (c.cant > p.stock) throw new Error("stock");
      const nuevo = await api("/productos/" + c.id, "PUT", { ...p, stock: Number(p.stock) - c.cant });
      productos = productos.map(x => x.id === c.id ? nuevo : x);
    }
    carrito = []; actualizarCarrito(); renderTodo();
    abrir(`<h3>✅ ¡Compra realizada!</h3><p>Total: Bs. ${total.toFixed(2)}</p><p>Gracias por tu compra.</p><button onclick="cerrar()">Cerrar</button>`);
  } catch (e) { toast("No se pudo completar la compra, revisa el stock"); }
}

// ====== CONTACTO ======
function renderContacto() {
  $("#contactoBox").innerHTML = `
    <div><b>📧 Correo</b><br><a href="mailto:${CORREO}">${CORREO}</a></div>
    <div><b>📱 WhatsApp</b><br>+591 ${NUM_DUENO}<br>
      <a class="btnw" href="${wa(NUM_DUENO, "Hola, quiero información sobre GameZone")}" target="_blank" rel="noopener">Abrir WhatsApp</a></div>
    <div><b>🕒 Horario</b><br>Lunes a sábado, 9:00 a 20:00</div>`;
}

// ====== ADMIN (CRUD) ======
const logueado = () => sessionStorage.getItem("admin") === "1";

function entrar() {
  if ($("#u").value === ADMIN.user && $("#p").value === ADMIN.pass) { sessionStorage.setItem("admin", "1"); renderAdmin(); }
  else toast("Usuario o contraseña incorrectos");
}
function salir() { sessionStorage.removeItem("admin"); renderAdmin(); vista("tienda"); }

function renderAdmin() {
  const a = $("#admin");
  $("#btnSalir").classList.toggle("hide", !logueado());
  if (!logueado()) {
    a.innerHTML = `<div class="panel login"><h2>Acceso administrador</h2>
      <input id="u" placeholder="Usuario"><input id="p" type="password" placeholder="Contraseña" onkeydown="if(event.key==='Enter')entrar()">
      <button onclick="entrar()">Ingresar</button></div>`;
    return;
  }
  const e = productos.find(p => p.id === editId) || {};
  a.innerHTML = `
  <div class="panel"><h2>${editId ? "Editar" : "Nuevo"} videojuego</h2>
    <div class="form">
      <label>Nombre<input id="fn" value="${esc(e.nombre)}"></label>
      <label>Categoría<input id="fc" list="dl" value="${esc(e.categoria)}"></label>
      <datalist id="dl">${listaCats().map(c => `<option value="${esc(c)}">`).join("")}</datalist>
      <label>Precio (Bs.)<input id="fp" type="number" min="0" step="0.01" value="${esc(e.precio)}"></label>
      <label>Stock<input id="fs" type="number" min="0" value="${esc(e.stock)}"></label>
      <label>URL de imagen<input id="fi" value="${esc(e.imagen)}"></label>
      <div><button onclick="guardar()">${editId ? "Actualizar" : "Agregar"}</button>
      ${editId ? `<button class="sec" onclick="editId=null;renderAdmin()">Cancelar</button>` : ""}</div>
    </div></div>
  <div class="panel"><h2>Productos (${productos.length})</h2><div class="tw"><table>
    <tr><th></th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th></th></tr>
    ${productos.map(p => `<tr><td><img src="${esc(p.imagen)}" alt="" onerror="this.onerror=null;this.src=PH"></td>
      <td>${esc(p.nombre)}</td><td>${esc(p.categoria)}</td><td>${Number(p.precio).toFixed(2)}</td><td>${esc(p.stock)}</td>
      <td><button class="sec" onclick="editId='${p.id}';renderAdmin();scrollTo(0,0)">Editar</button>
      <button class="del" onclick="borrar('${p.id}')">Eliminar</button></td></tr>`).join("")}
  </table></div></div>
  <div class="panel"><h2>Categorías</h2>
    <div class="bar"><input id="nc" placeholder="Nueva categoría"><button onclick="addCat()">Agregar</button></div>
    ${categorias.map(c => `<span style="display:inline-block;margin:0 8px 6px 0">${esc(cn(c))}
      <button class="del" style="padding:2px 8px" onclick="delCat('${c.id}')">×</button></span>`).join("") || "<small>Sin categorías en la tabla.</small>"}
  </div>
  <div class="panel"><h2>Datos de ejemplo</h2>
    <p style="color:var(--mut);font-size:.85rem">Borra TODOS los productos y categorías actuales y carga 8 videojuegos con portada y 5 categorías. Luego puedes editarlos.</p>
    <button class="del" onclick="sembrar()">Reemplazar por videojuegos de ejemplo</button>
  </div>`;
}

async function guardar() {
  const d = { nombre: $("#fn").value.trim(), categoria: $("#fc").value.trim(), precio: Number($("#fp").value), stock: parseInt($("#fs").value), imagen: $("#fi").value.trim() };
  if (!d.nombre || !d.categoria || isNaN(d.precio) || isNaN(d.stock)) return toast("Completa nombre, categoría, precio y stock");
  try {
    if (editId) { const r = await api("/productos/" + editId, "PUT", d); productos = productos.map(p => p.id === editId ? r : p); editId = null; toast("Producto actualizado"); }
    else { productos.push(await api("/productos", "POST", d)); toast("Producto agregado"); }
    renderTodo();
  } catch (e) { toast("Error al guardar"); }
}

async function borrar(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  try { await api("/productos/" + id, "DELETE"); productos = productos.filter(p => p.id !== id); renderTodo(); toast("Producto eliminado"); }
  catch (e) { toast("Error al eliminar"); }
}

async function addCat() {
  const nombre = $("#nc").value.trim(); if (!nombre) return;
  try { categorias.push(await api("/categorias", "POST", { nombre, monbre: nombre })); renderTodo(); }
  catch (e) { toast("Error al agregar la categoría"); }
}
async function delCat(id) {
  try { await api("/categorias/" + id, "DELETE"); categorias = categorias.filter(c => c.id !== id); renderTodo(); }
  catch (e) { toast("Error al eliminar"); }
}

async function sembrar() {
  if (!confirm("Se borrarán todos los productos y categorías actuales. ¿Continuar?")) return;
  const cats = ["Acción", "RPG", "Deportes", "Aventura", "Carreras"];
  const S = id => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`;
  const juegos = [
    ["Elden Ring", "RPG", 350, 8, S(1245620)],
    ["Baldur's Gate 3", "RPG", 390, 6, S(1086940)],
    ["Cyberpunk 2077", "RPG", 300, 14, S(1091500)],
    ["The Witcher 3", "RPG", 120, 20, S(292030)],
    ["Red Dead Redemption 2", "Acción", 420, 10, S(1174180)],
    ["Hades", "Acción", 150, 18, S(1145360)],
    ["Forza Horizon 5", "Carreras", 330, 15, S(1551360)],
    ["EA Sports FC 25", "Deportes", 380, 12, S(2669320)]
  ];
  toast("Cargando datos, espera...");
  try {
    for (const p of productos) await api("/productos/" + p.id, "DELETE");
    for (const c of categorias) await api("/categorias/" + c.id, "DELETE");
    for (const n of cats) await api("/categorias", "POST", { nombre: n, monbre: n });
    for (const [nombre, categoria, precio, stock, imagen] of juegos) await api("/productos", "POST", { nombre, categoria, precio, stock, imagen });
    await cargar(); toast("Datos de ejemplo cargados");
  } catch (e) { toast("Error durante la carga; revisa tu API"); cargar(); }
}

// ====== INICIO ======
cargar();
renderContacto();