require('dotenv').config();
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

async function iniciarSupervisor() {
  console.log("⚙️  Configurando al Supervisor con LangChain...");

  // 1. Instanciamos el cerebro del Agente
  // LangChain envuelve la API de Gemini y le agrega superpoderes de fábrica
 const agenteMaestro = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest", // <--- ACÁ ESTÁ EL ARREGLO (le sacamos el "Name")
    temperature: 0.1,
    maxRetries: 3,
    apiKey: process.env.GEMINI_API_KEY
  });

  console.log("🤖 Despertando al Agente...");

  try {
    // 2. Le damos su primera orden directa usando el método .invoke()
    const orden = "Sos un Arquitecto de Software Senior. Presentate en una sola oración y decime qué sos capaz de orquestar usando Node.js.";
    
    const respuesta = await agenteMaestro.invoke(orden);
    
    console.log("\n✅ Respuesta del Supervisor:");
    console.log("--------------------------------------------------");
    console.log(respuesta.content);
    console.log("--------------------------------------------------");

  } catch (error) {
    console.error("Hubo un problema de conexión:", error);
  }
}

iniciarSupervisor();