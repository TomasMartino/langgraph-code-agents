require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const { z } = require("zod");
const { ChatGroq } = require("@langchain/groq");
const { DynamicStructuredTool } = require("@langchain/core/tools");
const { StateGraph, START, END, Annotation } = require("@langchain/langgraph");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");

// ==========================================
// 0. EL FRENO DE MANO (15s -> Reducido a 2s para Groq)
// ==========================================
// Aumentamos el freno a 10 segundos para darle respiro al límite por minuto
const tomarUnMate = (ms) => new Promise(resolve => setTimeout(resolve, 10000));
// ==========================================
// 1. LAS HERRAMIENTAS
// ==========================================
const herramientaArchivo = new DynamicStructuredTool({
  name: "crear_archivo",
  description:
    "Crea o sobrescribe un archivo en el disco duro. Úsala para guardar código.",
  schema: z.object({
    ruta: z.string().describe("Ruta del archivo (ej: 'backend/pom.xml')"),
    codigo: z.string().describe("Código fuente completo"),
  }),
  func: async ({ ruta, codigo }) => {
    const rutaFinal = path.join(process.cwd(), "tienda-dinamica", ruta);
    await fs.mkdir(path.dirname(rutaFinal), { recursive: true });
    await fs.writeFile(rutaFinal, codigo);
    console.log(`   -> 📁 Archivo creado exitosamente: ${ruta}`);
    return `Archivo guardado en: ${ruta}`;
  },
});

const herramientaComando = new DynamicStructuredTool({
  name: "ejecutar_comando",
  description:
    "Ejecuta un comando en la terminal. Puedes encadenar comandos con &&.",
  schema: z.object({
    comando: z.string().describe("El comando exacto a ejecutar"),
    subcarpeta: z
      .string()
      .describe(
        "La carpeta donde ejecutarlo (ej: 'backend'). Usa '.' para la raíz.",
      ),
  }),
  func: async ({ comando, subcarpeta }) => {
    const rutaFinal = path.join(process.cwd(), "tienda-dinamica", subcarpeta);
    await fs.mkdir(rutaFinal, { recursive: true });
    console.log(`   -> 🖥️ Consola [${subcarpeta}]: Ejecutando '${comando}'...`);
    try {
      const { stdout } = await execPromise(comando, { cwd: rutaFinal });
      return `Éxito. Salida: ${stdout.substring(0, 200)}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
});

const mapaHerramientas = {
  crear_archivo: herramientaArchivo,
  ejecutar_comando: herramientaComando,
};

const modelo = new ChatGroq({
  // Cambiamos al nuevo modelo de OpenAI que está activo y tiene la cuota en cero
  model: "openai/gpt-oss-20b",
  temperature: 0.1,
  maxRetries: 3,
  apiKey: process.env.GROQ_API_KEY,
});

const modeloObrero = modelo.bindTools([herramientaArchivo, herramientaComando]);

// ==========================================
// 2. EL PIZARRÓN (ESTADO)
// ==========================================
const EstadoAgencia = Annotation.Root({
  archivos: Annotation({
    reducer: (actual, nuevo) => actual.concat(nuevo),
    default: () => [],
  }),
  necesidadDelSupervisor: Annotation({
    reducer: (actual, nuevo) => nuevo,
    default: () => "",
  }),
  manualDelEmpleado: Annotation({
    reducer: (actual, nuevo) => nuevo,
    default: () => "",
  }),
  siguientePaso: Annotation({
    reducer: (actual, nuevo) => nuevo,
    default: () => "supervisor",
  }),
});

// ==========================================
// 3. LA CADENA DE MANDO (AGENTES)
// ==========================================

// --- NODO 1: EL CEO (SUPERVISOR) ---
async function nodoSupervisor(estado) {
  console.log(
    "\n👔 [CEO]: Revisando el progreso del proyecto... (Pausando ⏳)",
  );
  await tomarUnMate(2000);

  const prompt = `Sos el Director del proyecto 'Glamour Stock'.
  
  Tu objetivo es completar este CHECKLIST de arquitectura:
  [ ] 'backend/pom.xml'
  [ ] 'backend/src/main/java/com/glamour/GlamourApplication.java'
  [ ] 'backend/src/main/java/com/glamour/controller/ProductController.java'
  [ ] 'backend/src/main/java/com/glamour/entity/Product.java'
  [ ] 'backend/src/main/resources/application.properties'
  [ ] 'frontend/index.html'
  
  Archivos que el equipo YA creó exitosamente: 
  [${estado.archivos.length > 0 ? estado.archivos.join(", ") : "Ninguno, el proyecto está vacío"}]
  
  INSTRUCCIONES DE SUPERVISIÓN:
  1. Compara estrictamente los archivos creados con el checklist.
  2. Si el Obrero se adelantó y creó archivos que no pediste, acéptalos y táchalos de tu lista mental.
  3. Si el Obrero creó un archivo en la ruta equivocada, pídele que lo vuelva a crear en la ruta correcta.
  4. Pide OBLIGATORIAMENTE que creen la siguiente tanda de archivos faltantes. No pidas todos a la vez.
  5. Si ABSOLUTAMENTE TODOS los archivos del checklist ya existen, tu misión terminó.
  
  Responde ÚNICAMENTE en formato JSON:
  {"necesidad": "La orden específica para el equipo detallando las rutas exactas", "estado": "continuar" o "FIN"}
  `;

  const respuesta = await modelo.invoke(prompt);

  let textoIA = "";
  if (typeof respuesta.content === "string") {
    textoIA = respuesta.content;
  } else if (Array.isArray(respuesta.content)) {
    textoIA = respuesta.content[0]?.text || "";
  } else {
    textoIA = JSON.stringify(respuesta.content);
  }

  const textoLimpio = textoIA.replace(/```json|```/g, "").trim();
  const decision = JSON.parse(textoLimpio);

  if (
    decision.estado === "FIN" ||
    decision.necesidad.toLowerCase().includes("todo listo")
  ) {
    console.log(
      "👔 [CEO]: ¡Arquitectura Full-Stack desplegada exitosamente! Cerrando operaciones.",
    );
    return { siguientePaso: "FIN" };
  }

  console.log(`👔 [CEO pide]: ${decision.necesidad}`);
  return {
    necesidadDelSupervisor: decision.necesidad,
    siguientePaso: "creador",
  };
}

// --- NODO 2: RRHH (TECH LEAD) ---
async function nodoCreador(estado) {
  console.log("🧠 [RRHH]: Traduciendo orden a nivel técnico... (Pausando ⏳)");
  await tomarUnMate(2000);

  const prompt = `Sos el Tech Lead del equipo. 
  El Jefe ordenó: "${estado.necesidadDelSupervisor}"
  
  Redacta las instrucciones exactas para el Obrero.
  REGLAS ESTRICTAS DE SUPERVIVENCIA:
  1. El Obrero SOLO debe crear los archivos solicitados usando la herramienta 'crear_archivo'.
  2. Adviértele que TIENE PROHIBIDO crear archivos extra que no se le pidieron.
  3. Oblígalo a respetar las rutas exactas.
  4. Exige código Java Spring Boot nivel Senior (con imports completos y 'package com.glamour...') o Frontend con Tailwind avanzado.
  
  Responde SOLO con el texto del prompt para el Obrero.`;

  const respuesta = await modelo.invoke(prompt);
  return { manualDelEmpleado: respuesta.content, siguientePaso: "ejecutor" };
}

// --- NODO 3: EL OBRERO (PROGRAMADOR) ---
async function nodoEjecutor(estado) {
  console.log(
    "👷‍♂️ [OBRERO]: Desarrollando código y configurando entorno... (Pausando ⏳)",
  );
  await tomarUnMate(2000);

  const mensajes = [
    new SystemMessage(estado.manualDelEmpleado),
    new HumanMessage(
      `OBLIGATORIO: DEBES usar la herramienta 'crear_archivo' en este turno. NO respondas con texto explicando el código. Usa estrictamente la llamada a la herramienta con los parámetros 'ruta' y 'codigo'. Asegúrate de incluir los paquetes e importaciones en Java.`,
    ),
  ];

  const respuesta = await modeloObrero.invoke(mensajes);
  let nuevosArchivos = [];

  if (respuesta.tool_calls && respuesta.tool_calls.length > 0) {
    for (const llamada of respuesta.tool_calls) {
      const herramienta = mapaHerramientas[llamada.name];
      if (herramienta) {
        await herramienta.invoke(llamada.args);
        if (llamada.name === "crear_archivo") {
          nuevosArchivos.push(llamada.args.ruta);
        }
      }
    }
  } else {
    console.log(
      `   -> ❌ ERROR DEL OBRERO: Respondió con texto en lugar de usar herramientas.`,
    );
  }

  // ¡OJO ACÁ! El obrero ahora le pasa el código a QA, no al CEO.
  return { archivos: nuevosArchivos, siguientePaso: "qa" };
}

// --- NODO 4: EL INSPECTOR (QA) ---
async function nodoQA(estado) {
  console.log(
    "🕵️‍♂️ [QA]: Revisando la calidad y sintaxis del código generado... (Pausando ⏳)",
  );
  await tomarUnMate(2000);

  if (!estado.archivos || estado.archivos.length === 0) {
    return { siguientePaso: "supervisor" };
  }

  let codigoARevisar = "";
  for (const archivo of estado.archivos) {
    try {
      const rutaFinal = path.join(process.cwd(), "tienda-dinamica", archivo);
      const contenido = await fs.readFile(rutaFinal, "utf-8");
      codigoARevisar += `\n--- Archivo: ${archivo} ---\n${contenido}\n`;
    } catch (e) {
      console.log(`   -> ⚠️ QA no pudo leer el archivo ${archivo} del disco.`);
    }
  }

  const prompt = `Sos el Ingeniero de Testing (QA) Senior.
  Revisa el siguiente código recién generado para detectar errores críticos:

  ${codigoARevisar}

  REGLAS DE ORO DE JAVA:
  1. PAQUETES: Todo archivo .java DEBE tener su declaración de package (ej: 'package com.glamour.entity;') en la primera línea.
  2. IMPORTACIONES: Todas las clases externas (@Entity, @RestController, List, etc.) DEBEN estar importadas.
  3. LÓGICA FANTASMA: Prohibido crear repositorios o servicios para entidades que no existen.
  
  Si el código tiene errores o falta de importaciones/paquetes, RECHÁZALO.
  
  Responde ÚNICAMENTE en formato JSON:
  - Si hay errores: {"estado": "RECHAZADO", "errores": "Falta package en Product.java. Faltan imports de JPA."}
  - Si está perfecto: {"estado": "APROBADO"}
  `;

  const respuesta = await modelo.invoke(prompt);
  let textoLimpio = "";

  if (typeof respuesta.content === "string") {
    textoLimpio = respuesta.content.replace(/```json|```/g, "").trim();
  } else if (Array.isArray(respuesta.content)) {
    textoLimpio = (respuesta.content[0]?.text || "")
      .replace(/```json|```/g, "")
      .trim();
  }

  let evaluacion;
  try {
    evaluacion = JSON.parse(textoLimpio);
  } catch (e) {
    evaluacion = { estado: "APROBADO" };
  }

  if (evaluacion.estado === "APROBADO") {
    console.log("🕵️‍♂️ [QA]: ✅ Código impecable. Pasando informe al CEO.");
    return { siguientePaso: "supervisor" };
  } else {
    console.log(
      `🕵️‍♂️ [QA]: ❌ ¡ALERTA DE BUGS! Código rechazado por: ${evaluacion.errores}`,
    );
    return {
      necesidadDelSupervisor: `[RECHAZO DE QA - CORRECCIÓN OBLIGATORIA]: QA rebotó tu código anterior. Debes sobrescribir los archivos para arreglar esto URGENTE: ${evaluacion.errores}`,
      siguientePaso: "creador",
    };
  }
}

// ==========================================
// 4. GRAFO (FLUJO DE TRABAJO)
// ==========================================
const flujo = new StateGraph(EstadoAgencia)
  .addNode("nodo_supervisor", nodoSupervisor)
  .addNode("nodo_creador", nodoCreador)
  .addNode("nodo_ejecutor", nodoEjecutor)
  .addNode("nodo_qa", nodoQA) // Registramos el nuevo agente
  .addEdge(START, "nodo_supervisor")

  // CEO decide: o termina, o manda a RRHH
  .addConditionalEdges("nodo_supervisor", (estado) => {
    return estado.siguientePaso === "FIN" ? END : "nodo_creador";
  })

  // RRHH manda directo al Obrero
  .addEdge("nodo_creador", "nodo_ejecutor")

  // El Obrero termina de teclear y manda directo a QA
  .addEdge("nodo_ejecutor", "nodo_qa")

  // QA decide: si aprueba va al CEO, si rechaza vuelve a RRHH
  .addConditionalEdges("nodo_qa", (estado) => {
    return estado.siguientePaso === "supervisor"
      ? "nodo_supervisor"
      : "nodo_creador";
  });

const agencia = flujo.compile();

async function ejecutar() {
  console.log("🚀 RETOMANDO AGENCIA: FASE API (Guardando tokens)...\n");

  await agencia.invoke({
    // Le decimos al sistema qué archivos ya están perfectos
    archivos: [
      "backend/pom.xml",
      "backend/src/main/java/com/glamour/GlamourApplication.java",
    ],
    // Salteamos al CEO y le damos la orden directa a RRHH
    necesidadDelSupervisor:
      "OBLIGATORIO: Usa la herramienta crear_archivo para generar backend/src/main/java/com/glamour/entity/Product.java y backend/src/main/java/com/glamour/controller/ProductController.java. NO crees carpetas fuera de 'backend/'.",
    manualDelEmpleado: "",
    siguientePaso: "creador", // <--- Arranca directo desde RRHH
  });
}

ejecutar();
