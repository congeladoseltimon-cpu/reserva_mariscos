// App Reservas de Marisco
// Los datos se guardan en localStorage del navegador.

const STORAGE_KEY = "reservasMarisco_v1";
const PRODUCTOS_STORAGE_KEY = "productosPrecios_v1";
const PRODUCTOS_LISTA_KEY = "productosLista_v1";

let PRODUCTOS = [
  { id: "patas_cocidas_xl", nombre: "Patas Cocidas XL", precioKg: 34.95 },
  { id: "patas_cocidas_l", nombre: "Patas Cocidas L", precioKg: 28.95 },
  { id: "bocas_cocidas_l", nombre: "Bocas Cocidas L", precioKg: 32.95 },
  { id: "langostino_cocido_10_30", nombre: "Langostino Cocido 10-30", precioKg: 13.95 },
  { id: "langostino_cocido_40_50", nombre: "Langostino Cocido 40-50", precioKg: 11.95 },
  { id: "langostino_crudo", nombre: "Langostino Crudo", precioKg: 10.95 },
  { id: "gamba_blanca_huelva_cruda", nombre: "Gamba blanca Huelva Cruda", precioKg: 39.95 },
  { id: "gamba_blanca_huelva_cocida", nombre: "Gamba Blanca Huelva Cocida", precioKg: 42.50 },
];

// NOTA: pon los precios reales por kilo en el campo precioKg (en euros) más arriba.

let reservas = [];
let productosTemporal = []; // productos de la ficha en edición (antes de guardar)
let cantidadACuenta = 0; // cantidad a cuenta para la ficha actual

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  cargarDesdeStorage();
  inicializarUI();
  renderizarListadoClientes();
});

function cargarDesdeStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    reservas = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error leyendo localStorage", e);
    reservas = [];
  }
}

function guardarEnStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservas));
}

function cargarProductos() {
  try {
    const raw = localStorage.getItem(PRODUCTOS_LISTA_KEY);
    if (raw) {
      const productosGuardados = JSON.parse(raw);
      if (productosGuardados && productosGuardados.length > 0) {
        PRODUCTOS = productosGuardados;
      }
    } else {
      // Si no hay productos guardados, intentar cargar solo precios (compatibilidad)
      const rawPrecios = localStorage.getItem(PRODUCTOS_STORAGE_KEY);
      if (rawPrecios) {
        const preciosGuardados = JSON.parse(rawPrecios);
        PRODUCTOS.forEach((p) => {
          if (preciosGuardados[p.id] !== undefined) {
            p.precioKg = preciosGuardados[p.id];
          }
        });
      }
    }
  } catch (e) {
    console.error("Error leyendo productos", e);
  }
}

function guardarProductos() {
  localStorage.setItem(PRODUCTOS_LISTA_KEY, JSON.stringify(PRODUCTOS));
}

function guardarPreciosProductos() {
  // Mantener compatibilidad con el sistema anterior
  const precios = {};
  PRODUCTOS.forEach((p) => {
    precios[p.id] = p.precioKg;
  });
  localStorage.setItem(PRODUCTOS_STORAGE_KEY, JSON.stringify(precios));
  // Guardar también la lista completa
  guardarProductos();
}

function inicializarUI() {
  const productoSelect = document.getElementById("producto-select");
  actualizarSelectProductos();

  // Botones barra superior
  document
    .getElementById("btn-nueva-reserva")
    .addEventListener("click", () => {
      limpiarFicha();
      mostrarFicha();
    });

  document
    .getElementById("btn-ver-clientes")
    .addEventListener("click", () => {
      mostrarListado();
    });

  document
    .getElementById("btn-exportar-excel")
    .addEventListener("click", exportarExcel);

  document
    .getElementById("btn-whatsapp-listado-productos")
    .addEventListener("click", enviarListadoProductosWhatsApp);

  // Ficha
  document
    .getElementById("ficha-form")
    .addEventListener("submit", manejarSubmitFicha);

  document
    .getElementById("btn-limpiar")
    .addEventListener("click", limpiarFicha);

  document
    .getElementById("btn-add-producto")
    .addEventListener("click", agregarProductoTemporal);

  document
    .getElementById("btn-whatsapp-ficha")
    .addEventListener("click", enviarFichaWhatsApp);

  document
    .getElementById("btn-backup")
    .addEventListener("click", exportarBackup);

  document
    .getElementById("btn-restaurar-backup")
    .addEventListener("click", () => {
      document.getElementById("input-restaurar-backup").click();
    });

  document
    .getElementById("input-restaurar-backup")
    .addEventListener("change", importarBackup);

  document
    .getElementById("btn-cerrar-ficha")
    .addEventListener("click", mostrarListado);

  // Botón lista de productos
  document
    .getElementById("btn-ver-productos")
    .addEventListener("click", toggleListaProductos);

  // Campo cantidad a cuenta
  document
    .getElementById("cantidad-cuenta")
    .addEventListener("input", actualizarTotalFinal);

  // Estados (reservado/guardado/entregado)
  document.querySelectorAll(".status-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
    });
  });

  // Mostrar precio/kg al cambiar producto y calcular precio total
  productoSelect.addEventListener("change", actualizarPrecioKgInfo);
  document.getElementById("cantidad").addEventListener("input", calcularPrecioTotal);
  document.getElementById("precio-kg").addEventListener("input", calcularPrecioTotal);
  actualizarPrecioKgInfo();
}

function actualizarPrecioKgInfo() {
  const productoSelect = document.getElementById("producto-select");
  const precioKgInput = document.getElementById("precio-kg");
  const id = productoSelect.value;
  const prod = PRODUCTOS.find((p) => p.id === id);
  
  if (!prod) {
    precioKgInput.value = "";
  } else {
    precioKgInput.value = prod.precioKg;
  }
  
  calcularPrecioTotal();
}

function calcularPrecioTotal() {
  // Esta función calcula el precio del producto individual que se está añadiendo
  // pero no lo muestra en ningún campo, solo se usa para validación
  // El precio total de la reserva se calcula en actualizarTotalFinal()
  actualizarTotalFinal();
}

function actualizarTotalFinal() {
  const cantidadCuentaInput = document.getElementById("cantidad-cuenta");
  const precioTotalInput = document.getElementById("precio-total");
  const totalFinalInput = document.getElementById("total-final");
  
  // Calcular subtotal de productos temporales (suma de todos los productos añadidos)
  const subtotal = productosTemporal.reduce(
    (suma, item) => suma + (parseFloat(item.precio) || 0),
    0
  );
  
  // Actualizar el campo "Precio total" con la suma de todos los productos
  if (subtotal > 0) {
    precioTotalInput.value = subtotal.toFixed(2);
  } else {
    precioTotalInput.value = "";
  }
  
  // Obtener cantidad a cuenta del input
  const cantidadACuentaValue = parseFloat(cantidadCuentaInput.value || "0");
  cantidadACuenta = cantidadACuentaValue;
  
  // Calcular total final
  const totalFinal = Math.max(0, subtotal - cantidadACuentaValue);
  
  if (subtotal > 0) {
    totalFinalInput.value = totalFinal.toFixed(2);
  } else {
    totalFinalInput.value = "";
  }
}

function mostrarFicha() {
  document.getElementById("ficha-section").classList.remove("hidden");
  document.getElementById("listado-section").classList.add("hidden");
}

function mostrarListado() {
  document.getElementById("ficha-section").classList.add("hidden");
  document.getElementById("listado-section").classList.remove("hidden");
  renderizarListadoClientes();
}

// Limpia la ficha para nueva reserva
function limpiarFicha() {
  const form = document.getElementById("ficha-form");
  form.reset();
  documentosTemporal = [];
  productosTemporal = [];
  document.getElementById("ficha-id").value = "";
  document.querySelectorAll(".status-toggle").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById("productos-list").innerHTML = "";
  document.getElementById("precio-kg").value = "";
  document.getElementById("precio-total").value = "";
  cantidadACuenta = 0;
  document.getElementById("cantidad-cuenta").value = "";
  document.getElementById("total-final").value = "";
  actualizarPrecioKgInfo();
}

// Añadir producto temporal a la ficha
function agregarProductoTemporal() {
  const productoSelect = document.getElementById("producto-select");
  const cantidadInput = document.getElementById("cantidad");
  const precioKgInput = document.getElementById("precio-kg");

  const productoId = productoSelect.value;
  const prod = PRODUCTOS.find((p) => p.id === productoId);
  const cantidad = parseFloat(cantidadInput.value || "0");
  const precioKg = parseFloat(precioKgInput.value || "0");

  if (!prod) {
    alert("Selecciona un producto.");
    return;
  }
  if (isNaN(cantidad) || cantidad <= 0) {
    alert("Introduce un peso/unidades válido.");
    return;
  }
  if (isNaN(precioKg) || precioKg <= 0) {
    alert("El precio por kg debe ser mayor que 0. Verifica que el producto tenga precio.");
    return;
  }

  // Calcular el precio total del producto: cantidad × precio por kg
  const precio = cantidad * precioKg;

  const item = {
    id: `${productoId}_${Date.now()}`,
    productoId,
    nombre: prod.nombre,
    cantidad,
    precio,
  };

  productosTemporal.push(item);
  cantidadInput.value = "";
  document.getElementById("precio-kg").value = "";
  productoSelect.value = "";
  renderizarProductosTemporal();
  actualizarTotalFinal();
}

function renderizarProductosTemporal() {
  const cont = document.getElementById("productos-list");
  cont.innerHTML = "";

  if (productosTemporal.length === 0) {
    cont.innerHTML =
      '<p style="font-size:0.8rem;color:rgba(0,255,221,0.7)">Sin productos añadidos.</p>';
    return;
  }

  productosTemporal.forEach((item) => {
    const div = document.createElement("div");
    div.className = "producto-item";

    const texto = document.createElement("div");
    texto.className = "producto-text";
    texto.textContent = `${item.nombre} · ${item.cantidad} kg/u · ${item.precio.toFixed(
      2
    )} €`;

    const acciones = document.createElement("div");
    acciones.className = "producto-actions";

    const btnBorrar = document.createElement("button");
    btnBorrar.type = "button";
    btnBorrar.className = "btn ghost";
    btnBorrar.textContent = "Borrar";
    btnBorrar.addEventListener("click", () => {
      productosTemporal = productosTemporal.filter((p) => p.id !== item.id);
      renderizarProductosTemporal();
      actualizarTotalFinal();
    });

    acciones.appendChild(btnBorrar);
    div.appendChild(texto);
    div.appendChild(acciones);
    cont.appendChild(div);
  });
}

// Guardar o actualizar ficha
function manejarSubmitFicha(e) {
  e.preventDefault();

  const idFicha = document.getElementById("ficha-id").value || null;
  const nombre = document.getElementById("nombre").value.trim();
  const apellidos = document.getElementById("apellidos").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const fechaEntrega = document.getElementById("fecha-entrega").value;

  if (!nombre || !apellidos || !telefono || !fechaEntrega) {
    alert("Rellena todos los datos del cliente y fecha de entrega.");
    return;
  }

  const estadoReservado = document
    .querySelector('.status-toggle[data-status="reservado"]')
    .classList.contains("active");
  const estadoGuardado = document
    .querySelector('.status-toggle[data-status="guardado"]')
    .classList.contains("active");
  const estadoEntregado = document
    .querySelector('.status-toggle[data-status="entregado"]')
    .classList.contains("active");

  const subtotal = productosTemporal.reduce(
    (suma, item) => suma + (parseFloat(item.precio) || 0),
    0
  );
  const cantidadACuentaValue = parseFloat(document.getElementById("cantidad-cuenta").value || "0");
  const total = Math.max(0, subtotal - cantidadACuentaValue);

  const ficha = {
    id: idFicha || `reserva_${Date.now()}`,
    nombre,
    apellidos,
    telefono,
    fechaEntrega,
    estados: {
      reservado: estadoReservado,
      guardado: estadoGuardado,
      entregado: estadoEntregado,
    },
    productos: [...productosTemporal],
    cantidadACuenta: parseFloat(document.getElementById("cantidad-cuenta").value || "0"),
    subtotal,
    total,
    creadoEn: idFicha
      ? null
      : new Date().toISOString(), // sólo para nuevas
    actualizadoEn: new Date().toISOString(),
  };

  if (idFicha) {
    reservas = reservas.map((r) => (r.id === idFicha ? ficha : r));
  } else {
    reservas.push(ficha);
  }

  guardarEnStorage();
  alert("Ficha guardada correctamente.");
  limpiarFicha();
  renderizarListadoClientes();
  mostrarListado();
}

function renderizarListadoClientes() {
  const cont = document.getElementById("clientes-list");
  cont.innerHTML = "";

  if (!reservas.length) {
    cont.innerHTML =
      '<p style="font-size:0.85rem;color:rgba(0,255,221,0.7)">Todavía no hay clientes. Crea una nueva reserva.</p>';
    return;
  }

  // Ordenar por fecha de entrega
  const ordenadas = [...reservas].sort((a, b) =>
    (a.fechaEntrega || "").localeCompare(b.fechaEntrega || "")
  );

  ordenadas.forEach((reserva) => {
    const card = document.createElement("div");
    card.className = "cliente-card";

    const header = document.createElement("div");
    header.className = "cliente-header";

    const izquierda = document.createElement("div");
    const nombreEl = document.createElement("div");
    nombreEl.className = "cliente-nombre";
    nombreEl.textContent = `${reserva.nombre} ${reserva.apellidos}`;

    const telEl = document.createElement("div");
    telEl.className = "cliente-telefono";
    telEl.textContent = `📞 ${reserva.telefono}`;

    izquierda.appendChild(nombreEl);
    izquierda.appendChild(telEl);

    const totalEl = document.createElement("div");
    totalEl.textContent = `${reserva.total.toFixed(2)} €`;

    header.appendChild(izquierda);
    header.appendChild(totalEl);

    const detalles = document.createElement("div");
    detalles.className = "cliente-detalles";

    const fechaChip = document.createElement("div");
    fechaChip.className = "chip";
    fechaChip.textContent = `Entrega: ${reserva.fechaEntrega}`;
    detalles.appendChild(fechaChip);

    const resChip = document.createElement("div");
    resChip.className =
      "chip" + (reserva.estados.reservado ? " active" : "");
    resChip.textContent = "Reservado ✅";
    detalles.appendChild(resChip);

    const guardChip = document.createElement("div");
    guardChip.className =
      "chip" + (reserva.estados.guardado ? " active" : "");
    guardChip.textContent = "Guardado ✅";
    detalles.appendChild(guardChip);

    const entChip = document.createElement("div");
    entChip.className =
      "chip" + (reserva.estados.entregado ? " active" : "");
    entChip.textContent = "Entregado ✅";
    detalles.appendChild(entChip);

    const acciones = document.createElement("div");
    acciones.className = "cliente-actions";

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn secondary";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", () => editarReserva(reserva.id));

    const btnWhats = document.createElement("button");
    btnWhats.type = "button";
    btnWhats.className = "btn secondary";
    btnWhats.textContent = "WhatsApp";
    btnWhats.addEventListener("click", () =>
      enviarFichaWhatsAppDesdeListado(reserva.id)
    );

    const btnBorrar = document.createElement("button");
    btnBorrar.type = "button";
    btnBorrar.className = "btn ghost";
    btnBorrar.textContent = "Borrar";
    btnBorrar.addEventListener("click", () => borrarReserva(reserva.id));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnWhats);
    acciones.appendChild(btnBorrar);

    card.appendChild(header);
    card.appendChild(detalles);
    card.appendChild(acciones);

    cont.appendChild(card);
  });
}

function editarReserva(id) {
  const reserva = reservas.find((r) => r.id === id);
  if (!reserva) return;

  mostrarFicha();

  document.getElementById("ficha-id").value = reserva.id;
  document.getElementById("nombre").value = reserva.nombre;
  document.getElementById("apellidos").value = reserva.apellidos;
  document.getElementById("telefono").value = reserva.telefono;
  document.getElementById("fecha-entrega").value = reserva.fechaEntrega;

  document
    .querySelector('.status-toggle[data-status="reservado"]')
    .classList.toggle("active", !!reserva.estados.reservado);
  document
    .querySelector('.status-toggle[data-status="guardado"]')
    .classList.toggle("active", !!reserva.estados.guardado);
  document
    .querySelector('.status-toggle[data-status="entregado"]')
    .classList.toggle("active", !!reserva.estados.entregado);

  productosTemporal = reserva.productos ? [...reserva.productos] : [];
  cantidadACuenta = reserva.cantidadACuenta || 0;
  document.getElementById("cantidad-cuenta").value = cantidadACuenta > 0 ? cantidadACuenta.toString() : "";
  actualizarTotalFinal();
  renderizarProductosTemporal();
}

function borrarReserva(id) {
  if (!confirm("¿Seguro que quieres borrar esta ficha de cliente?")) return;
  reservas = reservas.filter((r) => r.id !== id);
  guardarEnStorage();
  renderizarListadoClientes();
}

// Construye texto legible de una ficha
function construirTextoFicha(reserva) {
  const lineas = [];
  
  // 1. Nombre y Apellidos
  lineas.push(`${reserva.nombre} ${reserva.apellidos}`);
  lineas.push("");
  
  // 2. Productos (debajo paso y precio)
  if (!reserva.productos || !reserva.productos.length) {
    lineas.push("Sin productos");
  } else {
    reserva.productos.forEach((p) => {
      lineas.push(`${p.nombre}`);
      lineas.push(`${p.cantidad} kg/u - ${(parseFloat(p.precio) || 0).toFixed(2)} €`);
      lineas.push("");
    });
  }
  
  // 3. Precio total (subtotal)
  const subtotal = reserva.subtotal || reserva.productos?.reduce(
    (suma, item) => suma + (parseFloat(item.precio) || 0),
    0
  ) || 0;
  lineas.push(`Precio total: ${subtotal.toFixed(2)} €`);
  lineas.push("");
  
  // 4. Cantidad a cuenta
  const cantidadACuenta = reserva.cantidadACuenta || 0;
  lineas.push(`Cantidad a cuenta: ${cantidadACuenta.toFixed(2)} €`);
  lineas.push("");
  
  // 5. Total final
  const totalFinal = reserva.total || Math.max(0, subtotal - cantidadACuenta);
  lineas.push(`Total final: ${totalFinal.toFixed(2)} €`);
  lineas.push("");
  
  // 6. Estado: solo los que estén verificados
  const estados = [];
  if (reserva.estados.reservado) estados.push("Reservado");
  if (reserva.estados.guardado) estados.push("Guardado");
  if (reserva.estados.entregado) estados.push("Entregado");
  
  if (estados.length > 0) {
    lineas.push(`Estado: ${estados.join(" · ")}`);
    lineas.push("");
  }
  
  // 7. Fecha de entrega (formato día/mes/año)
  let fechaFormateada = reserva.fechaEntrega;
  if (fechaFormateada) {
    // Convertir de YYYY-MM-DD a DD/MM/YYYY
    const partes = fechaFormateada.split("-");
    if (partes.length === 3) {
      fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
  }
  lineas.push(`Fecha de entrega: ${fechaFormateada}`);
  lineas.push("");
  
  // 8. Texto final
  lineas.push("El total final del pedido es orientativo, a falta del pesaje final.");
  
  return lineas.join("\n");
}

// WhatsApp desde ficha abierta (usa datos del formulario)
function enviarFichaWhatsApp() {
  const idFicha = document.getElementById("ficha-id").value;
  let reserva;

  if (idFicha) {
    reserva = reservas.find((r) => r.id === idFicha);
  } else {
    // Si aún no está guardada, montamos ficha rápida con datos del formulario
    const nombre = document.getElementById("nombre").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const fechaEntrega = document
      .getElementById("fecha-entrega")
      .value.trim();

    const estadoReservado = document
      .querySelector('.status-toggle[data-status="reservado"]')
      .classList.contains("active");
    const estadoGuardado = document
      .querySelector('.status-toggle[data-status="guardado"]')
      .classList.contains("active");
    const estadoEntregado = document
      .querySelector('.status-toggle[data-status="entregado"]')
      .classList.contains("active");

    const subtotal = productosTemporal.reduce(
      (suma, item) => suma + (parseFloat(item.precio) || 0),
      0
    );
    const cantidadACuentaValue = parseFloat(document.getElementById("cantidad-cuenta").value || "0");
    const total = Math.max(0, subtotal - cantidadACuentaValue);

    reserva = {
      nombre,
      apellidos,
      telefono,
      fechaEntrega,
      estados: {
        reservado: estadoReservado,
        guardado: estadoGuardado,
        entregado: estadoEntregado,
      },
      productos: [...productosTemporal],
      cantidadACuenta: cantidadACuentaValue,
      subtotal,
      total,
    };
  }

  if (!reserva || !reserva.telefono) {
    alert("Necesitamos al menos el teléfono del cliente para WhatsApp.");
    return;
  }

  const texto = construirTextoFicha(reserva);
  const telLimpio = reserva.telefono.replace(/[^0-9+]/g, "");
  const url = `https://wa.me/${encodeURIComponent(
    telLimpio
  )}?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

// WhatsApp desde listado (ficha ya guardada)
function enviarFichaWhatsAppDesdeListado(id) {
  const reserva = reservas.find((r) => r.id === id);
  if (!reserva) return;
  if (!reserva.telefono) {
    alert("Esta ficha no tiene teléfono guardado.");
    return;
  }
  const texto = construirTextoFicha(reserva);
  const telLimpio = reserva.telefono.replace(/[^0-9+]/g, "");
  const url = `https://wa.me/${encodeURIComponent(
    telLimpio
  )}?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

// Exportar datos a CSV que Excel puede abrir
function exportarExcel() {
  if (!reservas.length) {
    alert("No hay datos para exportar.");
    return;
  }

  const cabecera = [
    "ID",
    "Nombre",
    "Apellidos",
    "Telefono",
    "FechaEntrega",
    "Reservado",
    "Guardado",
    "Entregado",
    "Total",
    "Productos",
  ];

  const filas = reservas.map((r) => {
    const productosTexto = (r.productos || [])
      .map(
        (p) =>
          `${p.nombre} (${p.cantidad} kg/u - ${(parseFloat(p.precio) ||
            0).toFixed(2)} €)`
      )
      .join(" | ");

    return [
      r.id,
      r.nombre,
      r.apellidos,
      r.telefono,
      r.fechaEntrega,
      r.estados.reservado ? "1" : "0",
      r.estados.guardado ? "1" : "0",
      r.estados.entregado ? "1" : "0",
      r.total.toFixed(2),
      productosTexto,
    ];
  });

  const lineas = [cabecera, ...filas].map((fila) =>
    fila
      .map((campo) => {
        const str = String(campo ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      })
      .join(",")
  );

  const csv = lineas.join("\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reservas_marisco.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Enviar listado de productos por WhatsApp (sin número, para elegir contacto)
function enviarListadoProductosWhatsApp() {
  const lineas = [];
  lineas.push("LISTADO DE PRODUCTOS Y PRECIOS/KG");
  lineas.push("--------------------------------");
  lineas.push("");
  
  // Ordenar productos alfabéticamente por nombre
  const productosOrdenados = [...PRODUCTOS].sort((a, b) => 
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
  
  productosOrdenados.forEach((p) => {
    lineas.push(`${p.nombre}`);
    lineas.push(`${p.precioKg} €/kg`);
    lineas.push("");
  });
  const texto = lineas.join("\n");
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

// Mostrar/ocultar lista de productos
function toggleListaProductos() {
  const listaDiv = document.getElementById("lista-productos");
  const btn = document.getElementById("btn-ver-productos");
  
  if (listaDiv.classList.contains("hidden")) {
    renderizarListaProductos();
    listaDiv.classList.remove("hidden");
    btn.textContent = "Ocultar lista de productos";
  } else {
    listaDiv.classList.add("hidden");
    btn.textContent = "Ver lista de productos";
  }
}

function renderizarListaProductos() {
  const cont = document.getElementById("lista-productos");
  cont.innerHTML = "";
  
  // Botón añadir producto
  const btnAñadir = document.createElement("button");
  btnAñadir.type = "button";
  btnAñadir.className = "btn primary";
  btnAñadir.textContent = "➕ Añadir producto";
  btnAñadir.style.width = "100%";
  btnAñadir.style.marginBottom = "0.75rem";
  btnAñadir.addEventListener("click", añadirProducto);
  cont.appendChild(btnAñadir);
  
  // Ordenar productos alfabéticamente por nombre
  const productosOrdenados = [...PRODUCTOS].sort((a, b) => 
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
  
  productosOrdenados.forEach((p) => {
    const div = document.createElement("div");
    div.className = "producto-lista-item";
    
    const productoCol = document.createElement("div");
    productoCol.className = "producto-col";
    productoCol.textContent = p.nombre;
    
    const precioCol = document.createElement("div");
    precioCol.className = "precio-col";
    precioCol.textContent = `${p.precioKg} €/kg`;
    
    const accionesCol = document.createElement("div");
    accionesCol.className = "acciones-col";
    accionesCol.style.display = "flex";
    accionesCol.style.gap = "0.5rem";
    accionesCol.style.alignItems = "center";
    
    const editarCol = document.createElement("div");
    editarCol.className = "editar-col";
    editarCol.textContent = "✏️";
    editarCol.style.cursor = "pointer";
    editarCol.addEventListener("click", () => editarPrecioProducto(p.id));
    
    const eliminarCol = document.createElement("div");
    eliminarCol.className = "eliminar-col";
    eliminarCol.textContent = "🗑️";
    eliminarCol.style.cursor = "pointer";
    eliminarCol.addEventListener("click", () => eliminarProducto(p.id));
    
    accionesCol.appendChild(editarCol);
    accionesCol.appendChild(eliminarCol);
    
    div.appendChild(productoCol);
    div.appendChild(precioCol);
    div.appendChild(accionesCol);
    cont.appendChild(div);
  });
}

function editarPrecioProducto(productoId) {
  const producto = PRODUCTOS.find((p) => p.id === productoId);
  if (!producto) return;
  
  const nuevoPrecio = prompt(
    `Editar precio de ${producto.nombre}\n\nPrecio actual: ${producto.precioKg} €/kg\n\nIntroduce el nuevo precio:`,
    producto.precioKg
  );
  
  if (nuevoPrecio === null) return; // Usuario canceló
  
  const precioNum = parseFloat(nuevoPrecio.replace(",", "."));
  if (isNaN(precioNum) || precioNum < 0) {
    alert("Por favor, introduce un precio válido (número mayor o igual a 0).");
    return;
  }
  
  producto.precioKg = precioNum;
  guardarProductos();
  renderizarListaProductos();
  actualizarSelectProductos();
  actualizarPrecioKgInfo();
}

function añadirProducto() {
  const nombre = prompt("Introduce el nombre del nuevo producto:");
  if (!nombre || nombre.trim() === "") {
    return; // Usuario canceló o nombre vacío
  }
  
  const precioStr = prompt(`Introduce el precio por kilo (€/kg) para "${nombre.trim()}":`);
  if (precioStr === null) {
    return; // Usuario canceló
  }
  
  const precioNum = parseFloat(precioStr.replace(",", "."));
  if (isNaN(precioNum) || precioNum < 0) {
    alert("Por favor, introduce un precio válido (número mayor o igual a 0).");
    return;
  }
  
  // Generar ID único
  const nuevoId = nombre.trim().toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
  
  const nuevoProducto = {
    id: nuevoId,
    nombre: nombre.trim(),
    precioKg: precioNum
  };
  
  PRODUCTOS.push(nuevoProducto);
  guardarProductos();
  renderizarListaProductos();
  actualizarSelectProductos();
}

function eliminarProducto(productoId) {
  const producto = PRODUCTOS.find((p) => p.id === productoId);
  if (!producto) return;
  
  if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${producto.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }
  
  PRODUCTOS = PRODUCTOS.filter((p) => p.id !== productoId);
  guardarProductos();
  renderizarListaProductos();
  actualizarSelectProductos();
  actualizarPrecioKgInfo();
}

function actualizarSelectProductos() {
  const productoSelect = document.getElementById("producto-select");
  const valorActual = productoSelect.value;
  productoSelect.innerHTML = '<option value="">-- Selecciona producto --</option>';
  
  // Ordenar productos alfabéticamente por nombre
  const productosOrdenados = [...PRODUCTOS].sort((a, b) => 
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
  
  productosOrdenados.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.nombre;
    productoSelect.appendChild(opt);
  });
  
  if (valorActual) {
    productoSelect.value = valorActual;
  }
}

// Función para exportar copia de seguridad
function exportarBackup() {
  if (!reservas.length) {
    alert("No hay fichas de clientes para exportar.");
    return;
  }

  // Crear objeto con todos los datos de las reservas
  const datosBackup = {
    version: "1.0",
    fechaExportacion: new Date().toISOString(),
    reservas: reservas
  };

  // Convertir a formato JavaScript que sea importable
  const contenidoJS = `// Copia de seguridad de fichas de clientes
// Fecha de exportación: ${new Date().toLocaleString('es-ES')}
// Total de fichas: ${reservas.length}

const backupData = ${JSON.stringify(datosBackup, null, 2)};

// Para restaurar, ejecuta: restaurarBackup(backupData);
`;

  // Crear blob y descargar
  const blob = new Blob([contenidoJS], { type: "application/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_reservas_${new Date().toISOString().split('T')[0]}.js`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert(`Copia de seguridad exportada correctamente.\nTotal de fichas: ${reservas.length}`);
}

// Función para importar copia de seguridad
function importarBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const contenido = e.target.result;
      
      // Extraer el JSON del archivo JS
      // Buscamos desde "const backupData = " hasta el punto y coma final
      const inicio = contenido.indexOf('const backupData = ');
      if (inicio === -1) {
        throw new Error("No se pudo encontrar los datos de backup en el archivo.");
      }
      
      // Encontrar el inicio del objeto JSON (después del =)
      let posInicio = contenido.indexOf('{', inicio);
      if (posInicio === -1) {
        throw new Error("Formato de archivo inválido.");
      }
      
      // Encontrar el final del objeto JSON (antes del punto y coma)
      // Necesitamos contar las llaves para encontrar el cierre correcto
      let nivel = 0;
      let posFinal = posInicio;
      let dentroComillas = false;
      let escape = false;
      
      for (let i = posInicio; i < contenido.length; i++) {
        const char = contenido[i];
        
        if (escape) {
          escape = false;
          continue;
        }
        
        if (char === '\\') {
          escape = true;
          continue;
        }
        
        if (char === '"' && !escape) {
          dentroComillas = !dentroComillas;
          continue;
        }
        
        if (dentroComillas) continue;
        
        if (char === '{') {
          nivel++;
        } else if (char === '}') {
          nivel--;
          if (nivel === 0) {
            posFinal = i + 1;
            break;
          }
        }
      }
      
      if (nivel !== 0) {
        throw new Error("El objeto JSON en el archivo está incompleto.");
      }
      
      // Extraer y parsear el JSON
      const jsonStr = contenido.substring(posInicio, posFinal);
      const datosBackup = JSON.parse(jsonStr);
      
      if (!datosBackup || !Array.isArray(datosBackup.reservas)) {
        throw new Error("El archivo no contiene datos válidos de copia de seguridad.");
      }

      // Confirmar antes de importar
      const confirmar = confirm(
        `Se encontraron ${datosBackup.reservas.length} fichas en la copia de seguridad.\n\n` +
        `¿Deseas restaurar estas fichas?\n\n` +
        `ADVERTENCIA: Esto reemplazará todas las fichas actuales.`
      );

      if (!confirmar) {
        // Limpiar el input
        event.target.value = "";
        return;
      }

      // Restaurar las reservas
      reservas = datosBackup.reservas;
      guardarEnStorage();
      
      alert(`Copia de seguridad restaurada correctamente.\nTotal de fichas restauradas: ${reservas.length}`);
      
      // Actualizar la interfaz
      renderizarListadoClientes();
      mostrarListado();
      
    } catch (error) {
      console.error("Error importando backup:", error);
      alert(`Error al importar la copia de seguridad:\n${error.message}\n\nAsegúrate de que el archivo es una copia de seguridad válida.`);
    } finally {
      // Limpiar el input
      event.target.value = "";
    }
  };
  
  reader.onerror = function() {
    alert("Error al leer el archivo.");
    event.target.value = "";
  };
  
  reader.readAsText(file);
}
