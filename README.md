MINI AGENCIA IA (AUTO-DEV SQUAD)

Un experimento de código abierto para explorar el poder de los sistemas Multi-Agente usando LangGraph y Groq.

Este proyecto levanta una pequeña "agencia de desarrollo" en tu terminal. Los agentes de Inteligencia Artificial colaboran entre sí, escriben código, lo revisan y se corrigen mutuamente para construir la base de un proyecto Full-Stack (Java Spring Boot + HTML/JS) de forma completamente autónoma.

No es una herramienta para reemplazar programadores, sino una prueba de concepto (PoC) muy divertida sobre cómo la IA puede auto-regularse usando un flujo de "Actor-Crítico" (Programador + QA).

--- EL EQUIPO (ARQUITECTURA) ---

El script define 4 agentes con roles específicos que interactúan en un ciclo continuo:

CEO (Supervisor): Tiene el panorama general. Lee un checklist de la arquitectura deseada y delega qué archivo hay que crear a continuación.

RRHH (Tech Lead): Recibe la orden del CEO y redacta un prompt técnico estricto para el programador (rutas exactas, frameworks a usar, etc.).

Obrero (Programador): Escribe el código y utiliza una herramienta (Tool Calling) para crear físicamente el archivo en el disco duro.

QA (Inspector): Lee el archivo recién creado por el Obrero. Si detecta que faltan imports, packages o hay errores de lógica, rechaza el código y obliga al Obrero a reescribirlo antes de avisarle al CEO.

--- TECNOLOGÍAS UTILIZADAS ---

Node.js

LangGraph (Para orquestar el grafo de estados y los turnos de los agentes)

Groq API (Para inferencia ultrarrápida usando modelos Open Source)

Modelos: Compatible con Llama 3.1, Llama 3.3, o Mixtral (configurable)

--- INSTALACIÓN Y USO ---

Cloná este repositorio desde tu terminal:
git clone https://github.com/TU_USUARIO/mini-agencia-ia.git
cd mini-agencia-ia

Instalá las dependencias necesarias:
npm install

Configurá tus variables de entorno. Creá un archivo llamado exactamente .env en la raíz del proyecto y agregá tu API Key gratuita de Groq de esta manera:
GROQ_API_KEY=tu_api_key_aqui
GROQ_MODEL=llama-3.1-8b-instant

¡Dale vida a la agencia! Ejecutá el siguiente comando:
node agencia_v3.js

Nota: Los archivos generados por los agentes se guardarán automáticamente en una carpeta nueva llamada "tienda-dinamica".

--- CONSIDERACIONES (LÍMITES DE API) ---

Como la agencia lee y escribe mucho código en cada ciclo, es posible que te choques con los límites de la capa gratuita de Groq. Si la terminal te tira un error "RateLimitError 429", simplemente dejalo descansar unos minutos o cambiá el modelo en el archivo .env por otro que tenga la cuota intacta.

--- CONTRIBUCIONES ---

Este es un proyecto de aprendizaje. Si querés agregarle un Agente DevOps que compile el código de Java, o un Agente Diseñador que mejore el frontend, ¡los Pull Requests son más que bienvenidos!

Creado con mucho mate y código.
