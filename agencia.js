require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { DynamicStructuredTool } = require("@langchain/core/tools");
const { StateGraph, START, END, Annotation } = require("@langchain/langgraph");

// ==========================================
// 1. CEREBRO Y HERRAMIENTAS
// ==========================================
const herramientaCrearArchivo = new DynamicStructuredTool({
  name: "crear_archivo",
  description: "Crea o sobrescribe un archivo en el disco duro. Úsala SIEMPRE que debas escribir código.",
  schema: z.object({
    ruta: z.string().describe("Ruta del archivo (ej: 'backend/server.js')"),
    codigo: z.string().describe("Código fuente completo")
  }),
  func: async ({ ruta, codigo }) => {
    // Todo se guardará en la carpeta del proyecto de tu hermana
    const rutaFinal = path.join(process.cwd(), 'tienda-hermana', ruta);
    await fs.mkdir(path.dirname(rutaFinal), { recursive: true });
    await fs.writeFile(rutaFinal, codigo);
    return `¡Éxito! Archivo guardado en: ${rutaFinal}`;
  }
});

// El Cerebro Base (con el patovica de reintentos integrado)
const modelo = new ChatGoogleGenerativeAI({
  model: "gemini-flash-latest",
  temperature: 0.1,
  maxRetries: 3, 
  apiKey: process.env.GEMINI_API_KEY
});

// Al Backend le damos el cerebro PERO le atamos las manos (tools)
const modeloBackend = modelo.bindTools([herramientaCrearArchivo]);

// ==========================================
// 2. EL PIZARRÓN (Estado)
// ==========================================
const EstadoAgencia = Annotation.Root({
  historial: Annotation({
    reducer: (estadoActual, nuevosDatos) => estadoActual.concat(nuevosDatos),
    default: () => [],
  }),
  siguientePaso: Annotation({
    reducer: (estadoActual, nuevoDato) => nuevoDato,
    default: () => "supervisor",
  })
});

// ==========================================
// 3. LOS EMPLEADOS (Ahora potenciados por IA)
// ==========================================
async function nodoSupervisor(estado) {
  console.log("👔 [Supervisor]: Pensando la arquitectura de la tienda...");
  
  // El Supervisor evalúa qué hacer. Le pedimos que arme algo chico para probar.
  const prompt = `Sos el Project Manager. Dile al Backend Dev que cree un archivo 'backend/server.js' muy básico con ExpressJS para el proyecto. Sé directo y conciso.`;
  
  const respuesta = await modelo.invoke(prompt);
  console.log(`👔 [Supervisor dice]: ${respuesta.content}\n`);
  
  return {
    historial: [`Orden del Supervisor: ${respuesta.content}`],
    siguientePaso: "backend" 
  };
}

async function nodoBackend(estado) {
  console.log("💻 [Backend Dev]: Leyendo el Pizarrón y programando...");
  
  // El Backend lee la ÚLTIMA orden que dejó el Supervisor en el Pizarrón
  const orden = estado.historial[estado.historial.length - 1];
  
  const prompt = `Sos el Backend Dev. Cumple esta orden usando tu herramienta 'crear_archivo': "${orden}"`;
  
  // Invocamos al modelo que SÍ tiene las herramientas
  const respuesta = await modeloBackend.invoke(prompt);
  
  let mensajeAccion = "💻 [Backend Dev]: No necesité crear archivos.";

  // Verificamos si la IA decidió usar sus herramientas
  if (respuesta.tool_calls && respuesta.tool_calls.length > 0) {
    for (const llamada of respuesta.tool_calls) {
       console.log(`   -> 🛠️ Ejecutando herramienta: ${llamada.name} en la ruta: ${llamada.args.ruta}`);
       await herramientaCrearArchivo.invoke(llamada.args);
    }
    mensajeAccion = "💻 [Backend Dev]: Archivos del backend generados con éxito.";
  }

  return {
    historial: [mensajeAccion],
    siguientePaso: "FIN" 
  };
}

// ==========================================
// 4. EL RUTEADOR Y EL GRAFO
// ==========================================
function ruteador(estado) {
  if (estado.siguientePaso === "backend") return "nodo_backend";
  if (estado.siguientePaso === "FIN") return END;
  return END;
}

const flujoTrabajo = new StateGraph(EstadoAgencia)
  .addNode("nodo_supervisor", nodoSupervisor)
  .addNode("nodo_backend", nodoBackend)
  .addEdge(START, "nodo_supervisor") 
  .addConditionalEdges("nodo_supervisor", ruteador) 
  .addEdge("nodo_backend", END);

const agencia = flujoTrabajo.compile();

// ==========================================
// 🚀 INICIANDO LA AGENCIA
// ==========================================
async function iniciar() {
  console.log("🚀 Despertando a los Agentes con IA...\n");
  const estadoInicial = { historial: [], siguientePaso: "supervisor" };
  const resultadoFinal = await agencia.invoke(estadoInicial);
  
  console.log("\n✅ PROYECTO TERMINADO. Estado Final:");
  console.log(resultadoFinal.historial);
}

iniciar();