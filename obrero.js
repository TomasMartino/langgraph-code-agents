require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { DynamicStructuredTool } = require("@langchain/core/tools");

async function iniciarObrero() {
  console.log("⚙️  Forjando la pala y el pico del Agente...");

  // ==========================================
  // 1. LA HERRAMIENTA (Nuestras manos en Node)
  // ==========================================
  const herramientaCrearArchivo = new DynamicStructuredTool({
    name: "crear_archivo",
    description: "Crea un archivo en el disco duro. Úsala SIEMPRE que debas escribir código.",
    schema: z.object({
      ruta: z.string().describe("Ruta del archivo, ej: 'index.html' o 'src/App.jsx'"),
      codigo: z.string().describe("Código fuente completo a guardar")
    }),
    func: async ({ ruta, codigo }) => {
      const rutaFinal = path.join(process.cwd(), 'glamour-robot', ruta);
      await fs.mkdir(path.dirname(rutaFinal), { recursive: true });
      await fs.writeFile(rutaFinal, codigo);
      return `¡Éxito! Archivo guardado en: ${rutaFinal}`;
    }
  });

  // ==========================================
  // 2. EL CEREBRO
  // ==========================================
  const modelo = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest",
    temperature: 0.1,
    apiKey: process.env.GEMINI_API_KEY // <--- ¡Faltaba enchufarle la llave acá!
  });

  // 🔥 LA MAGIA MODERNA: Le "pegamos" las herramientas al modelo
  const modeloConManos = modelo.bindTools([herramientaCrearArchivo]);

  console.log("👷‍♂️ El Obrero está leyendo los planos...\n");

  try {
    // Le damos la orden directa al modelo con las herramientas ya pegadas
    const orden = "Creá un archivo llamado 'index.html' con una estructura web básica, profesional y elegante para la tienda de cosméticos Glamour Stock.";
    
    const respuesta = await modeloConManos.invoke(orden);

    // ==========================================
    // 3. INTERCEPTANDO LA DECISIÓN DE LA IA
    // ==========================================
    // Verificamos si el cerebro de Gemini decidió que necesita usar una herramienta
    if (respuesta.tool_calls && respuesta.tool_calls.length > 0) {
        const llamada = respuesta.tool_calls[0]; // Agarramos la herramienta que eligió
        
        console.log(`🤖 La IA decidió usar la herramienta: [${llamada.name}]`);
        console.log(`📂 Ruta elegida por la IA: ${llamada.args.ruta}`);
        console.log(`⏳ Escribiendo en el disco duro...\n`);
        
        // ¡Acá es donde Node.js ejecuta la función real con los datos que inventó la IA!
        const resultadoHerramienta = await herramientaCrearArchivo.invoke(llamada.args);
        
        console.log(`✅ ${resultadoHerramienta}`);
    } else {
        // Si no usó herramientas, es que solo quería charlar
        console.log("La IA solo respondió con texto:", respuesta.content);
    }

    console.log("\n✨ Trabajo terminado. Revisá tu explorador de archivos a la izquierda.");
  } catch (error) {
    console.error("Error en la ejecución:", error);
  }
}

iniciarObrero();