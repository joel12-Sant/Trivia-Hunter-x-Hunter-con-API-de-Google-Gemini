import { temas } from "./temas.js";

const MODELO = "gemini-2.5-flash"; //escogi este modelo porque funciona mejor segun la documentación
const API_KEY = "AIzaSyAeF-MwthmeChj3E2Kjs2BZ9ZbpbLzxJJo"; //mi api key

//meti todo dentro de una funcion para generar el prompt aleatorio
function generarPrompt() {
    
    // generamos el tema aleatorio
    const temaAleatorio = temas[Math.floor(Math.random() * temas.length)];

    // primero defini el prompt
    const prompt = `En el contexto del anime y manga "Hunter x Hunter".
  Genera UNA sola pregunta de opción múltiple sobre el siguiente tema: ${temaAleatorio}.
  Proporciona cuatro opciones de respuesta y señala cuál es la correcta.
  Devuelve SOLO un objeto JSON con exactamente estas propiedades:
  "question": string,
  "options": array de 4 strings,
  "correct_answer": string (una de las opciones),
  "explanation": string.

  Ejemplo de formato (NO lo repitas, solo respeta el formato):
  {
    "question": "¿Quién es el mejor amigo de Gon?",
    "options": [
      "a) Killua Zoldyck",
      "b) Kurapika",
      "c) Leorio",
      "d) Hisoka"
    ],
    "correct_answer": "a) Killua Zoldyck",
    "explanation": "Killua y Gon se vuelven mejores amigos desde el examen de cazador."
  }

  Recuerda: SOLO responde con el objeto JSON, sin texto adicional.`;

    return prompt;
}

// definimos la url para la llamada a la api
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${API_KEY}`;

// hacvemos la llamada a la api
async function respuestaAPI() {
    // asi generamos el prompt diferente cada vez
    const prompt = generarPrompt();
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.25,
                    responseMimeType: "application/json"
                }
            })
        });

        // aqui se manejan los errores HTTP
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error HTTP ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        console.log("Respuesta transformada a json:", data);

        // extraemos el texto de la respuesta
        const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const textResultTrimmed = textResult.trim();
        const firstBraceIndex = textResultTrimmed.indexOf("{");
        const lastBraceIndex = textResultTrimmed.lastIndexOf("}");

        if (firstBraceIndex === -1 || lastBraceIndex === -1) {
            console.log("No se pudo encontrar un objeto JSON en la respuesta.");
            return null;
        }

        const jsonString = textResultTrimmed.substring(firstBraceIndex, lastBraceIndex + 1);

        if (jsonString) {
            const questionData = JSON.parse(jsonString);
            console.log("Pregunta parseada:", questionData);
            return questionData;
        } else {
            console.log("No se pudo extraer el texto de la respuesta.");
            return null;
        }
    } catch (error) {
        console.error("Hubo un error en la petición:", error);
        document.getElementById("preguntas").textContent =
            "Error al cargar la pregunta, rvisa la clave API o la consola.";
        return null;
    }
}

// funcion para cargar la pregunta y mostrarla en el html
async function cargarPregunta() {
    const questionEl = document.getElementById("preguntas");
    const optionsEl = document.getElementById("opciones");

    // mensaje que se carga mientras se espera la respuesta
    questionEl.className = "texto-carga";
    questionEl.textContent = "Cargando pregunta de Gemini...";
    optionsEl.innerHTML = "";

    const datosPregunta = await respuestaAPI();
    console.log("Datos de la pregunta recibidos:", datosPregunta);

    if (datosPregunta) {
        desplegarPregunta(datosPregunta);
    } else {
        questionEl.className = "texto-error";
        questionEl.textContent = "No se pudo cargar la pregunta. Intenta de nuevo.";
    }
}

function desplegarPregunta(datosPregunta) {
    const contenedorPreguntaEl = document.getElementById("contenedor-preguntas");
    const questionEl = document.getElementById("preguntas");
    const optionsEl = document.getElementById("opciones");

    questionEl.className = "preguntas";
    questionEl.textContent = datosPregunta.question || "Pregunta no disponible";
    optionsEl.innerHTML = "";
    optionsEl.className = "opciones";

    (datosPregunta.options || []).forEach((opcion) => {
        const boton = document.createElement("button");
        boton.className = "boton-opcion";
        boton.textContent = opcion;

        boton.addEventListener("click", () => {
            const esCorrecta =
                opcion.trim().toLowerCase() ===
                (datosPregunta.correct_answer || "").trim().toLowerCase();

            const todosLosBotones = optionsEl.querySelectorAll(".boton-opcion");


            todosLosBotones.forEach(b => {
                const opcionDeEsteBoton = b.textContent.trim().toLowerCase();
                const opcionCorrecta = (datosPregunta.correct_answer || "").trim().toLowerCase();

                if (opcionDeEsteBoton === opcionCorrecta) {
                    b.classList.add("correcta");
                } else {
                    b.classList.add("no-seleccionada");
                }

                // desactivar para que no se pueda volver a hacer clic
                b.disabled = true;
            });

            // 2. Si la que eligió es incorrecta, a esa le ponemos la clase "incorrecta"
            if (!esCorrecta) {
                boton.classList.remove("no-seleccionada");
                boton.classList.add("incorrecta");
            }

            cargarContadores(esCorrecta);

            const mensaje = esCorrecta ? "Correcto" : "Incorrecto";
            const explicacion = datosPregunta.explanation
                ? "\n\nExplicación: " + datosPregunta.explanation
                : "";

            const elementoMensaje = document.getElementById("respuesta");
            elementoMensaje.textContent = mensaje + explicacion;

            // creamos el boton para la siguiente pregunta
            let botonSiguiente = document.getElementById("btn-siguiente");
            if (!botonSiguiente) {
                botonSiguiente = document.createElement("button");
                botonSiguiente.id = "btn-siguiente";
                botonSiguiente.className = "boton-opcion";
                botonSiguiente.textContent = "Siguiente pregunta";
                contenedorPreguntaEl.appendChild(botonSiguiente);

                botonSiguiente.addEventListener("click", () => {
                    // limpiamos
                    elementoMensaje.textContent = "";
                    botonSiguiente.remove();
                    // cargamos la siguiente pregunta
                    cargarPregunta();
                });
            }
        });

        optionsEl.appendChild(boton);
    });
}


// aqui verificamos y actualizamos los contadores
function cargarContadores(esCorrecta) {
    // leemos los valores guardados o usamos 0 si no hay nada
    let correctas = parseInt(localStorage.getItem("correctas") || "0", 10);
    let incorrectas = parseInt(localStorage.getItem("incorrectas") || "0", 10);

    // si se llamó con true/false, actualizamos los contadores
    if (esCorrecta === true) {
        correctas++;
    } else if (esCorrecta === false) {
        incorrectas++;
    }

    // guardamos de nuevo en localStorage
    localStorage.setItem("correctas", correctas.toString());
    localStorage.setItem("incorrectas", incorrectas.toString());

    // actualizamos
    const correctasEl = document.getElementById("correctas");
    const incorrectasEl = document.getElementById("incorrectas");

    if (correctasEl) {
        correctasEl.textContent = correctas;
    }
    if (incorrectasEl) {
        incorrectasEl.textContent = incorrectas;
    }
}

window.addEventListener("load", () => {
    console.log("Página cargada y función inicial ejecutada.");

    cargarContadores();
    cargarPregunta();
});