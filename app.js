const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
} = require("@bot-whatsapp/bot");
const QRPortalWeb = require("@bot-whatsapp/portal");
const BaileysProvider = require("@bot-whatsapp/provider/baileys");
const MySQLAdapter = require("@bot-whatsapp/database/mysql");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

/**
 * Declaramos las conexiones de MySQL
 */
const MYSQL_DB_HOST = "10.21.90.6";
const MYSQL_DB_USER = "Wmurillo";
const MYSQL_DB_PASSWORD = "Wmurillo66*";
const MYSQL_DB_NAME = "chat_org";
const MYSQL_DB_PORT = "3306";

/**
 * Credenciales de GLPI
 */
const GLPI_API_URL = "http://localhost/glpi/apirest.php/";
const GLPI_USER_TOKEN = "theiFbs0MHnLfo5lxTUdtHJqYyW00eqeZ9tItSay";
const GLPI_API_TOKEN = "F8YETkJFPsW8SxEODJV9FQguCkPhcwUKT3T94kew";

// verifica el token de la session 
const getSessionToken = async () => {
  try {
    const response = await axios.get(`${GLPI_API_URL}/initSession`, {
      headers: {
        Authorization: `user_token ${GLPI_USER_TOKEN}`,
        "App-Token": GLPI_API_TOKEN,
      },
    });
    return response.data.session_token;
  } catch (error) {
    console.error(
      "Error iniciando sesión en GLPI:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};
// crea ticket en el GLPI 
const createGLPITicket = async (ticketData) => {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    console.error("No se pudo obtener el session_token");
    return null;
  }

  try {
    let imageHtml = '';
    if (ticketData.images.length > 0) {
      imageHtml = ticketData.images.map(imagePath => {
        return `<p><img src="data:image/jpeg;base64,${fs.readFileSync(imagePath, { encoding: 'base64' })}" alt="Imagen adjunta"></p>`;
      }).join('');
    }

    const input = {
      input: {
        name: ticketData.title,
        content: `${ticketData.description}\n${imageHtml}`, // Agregar las imágenes al campo "content"
        status: 1,
      },
    };

    const response = await axios.post(`${GLPI_API_URL}/Ticket`, input, {
      headers: {
        "Content-Type": "application/json",
        "Session-Token": sessionToken,
        "App-Token": GLPI_API_TOKEN,
      },
    });
    console.log("Ticket creado con éxito:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error creando ticket en GLPI:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};
// almacena la imagen localmente 
const saveImage = async (message) => {
  const stream = await downloadContentFromMessage(message, "image");
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  const filePath = path.join(__dirname, "images", `${Date.now()}.jpg`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};
// almacena la data que ingresa el usuario
const ticketData = {
  title: "",
  description: "",
  sede: "",
  area: "",
  issue: "",
  images: [],
};
// filtro que response al primer Hola 
const primerFiltro = addKeyword([
  "hola",
  "ola",
  "Buenos días",
  "buenos dias",
  "buenas tardes",
])
  .addAnswer(["Bienvenido a soporte TI", "atenderemos tu solicitud"])
  .addAnswer(
    [
      "¿De qué sede te comunicas?",
      "La 33",
      "Floresta",
      "Pedregal",
      "Sabaneta parque",
      "Sabaneta avenida",
      "Almendros",
      "San Joaquin",
      "Rionegro",
      "San Antonio De Prado",
    ],
    { capture: true },
    (ctx, { fallBack }) => {
      const userInput = ctx.body.toLowerCase();
      const sedes = [
        "la 33",
        "floresta",
        "pedregal",
        "sabaneta parque",
        "sabaneta avenida",
        "almendros",
        "san joaquin",
        "rionegro",
        "san antonio de prado",
      ];

      const sedevalida = sedes.some((sede) =>
        userInput.includes(sede.toLowerCase())
      );

      if (!sedevalida) {
        return fallBack();
      }
      console.log("sede seleccionada: ", userInput);
      ticketData.sede = userInput;
    }
  )
  .addAnswer(
    [
      "Ingresa el área donde se presenta el inconveniente: ",
      "Administración",
      "Lineal de cajas",
      "Recibo",
      "CCTV",
    ],
    { capture: true },
    (ctx, { fallBack }) => {
      const userMenu = ctx.body.toLowerCase();
      const menu = ["Administración", "Lineal de cajas", "Recibo", "CCTV"];

      const opcionValida = menu.some((men) =>
        userMenu.includes(men.toLowerCase())
      );

      if (!opcionValida) {
        return fallBack();
      }
      console.log("menu principal: ", userMenu);
      ticketData.area = userMenu;
    }
  );
// opciones para administracion 
const AdminFiltro = addKeyword(["Administración", "administracion"])
  .addAnswer(
    [
      "Selecciona cuál es el caso: ",
      "1- Impresora no imprime",
      "2- Equipo sin conexión o navegación",
      "3- Sin acceso a SIEZA Interprice",
      "4- Monarch no imprime",
      "5- Equipo no enciende",
      "6-Emisora no suena",
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
      const respAdmin = ctx.body.trim();
      const optionsAdmin = ["1", "2", "3", "4", "5", "6"];
      const responseValida = optionsAdmin.some((option) =>
        respAdmin.includes(option.toLowerCase())
      );

      if (!responseValida) {
        return fallBack();
      }
      const AdminSelection = ctx.body;
      console.log("respuesta admin select", AdminSelection);
      ticketData.issue = `Problema en Administración: ${AdminSelection}`;
    }
  )
  .addAnswer(
    ["Envia una imagen con descripcion del problema: "],
    { capture: true },
    async (ctx) => {
      let imageFilePath = null;

      if (ctx.message && ctx.message.imageMessage) {
        imageFilePath = await saveImage(ctx.message.imageMessage);
        ticketData.description =
          ctx.message.imageMessage.caption || "Imagen recibida sin descripción";
        ticketData.images.push(imageFilePath); // Agrega el archivo al arreglo
      }

      console.log("descripción admin: ", ticketData.description, imageFilePath);
      ticketData.title = `Ticket de ${ticketData.area} - ${ticketData.issue}`;
      await createGLPITicket(ticketData);
    }
  )
  .addAnswer(
    "Caso registrado con exito en un promedio de 10 min recibira una respuesta"
  );
// opciones para lineal de cajas 
const Lineal = addKeyword(["Lineal de cajas", "lineal de cajas"])
  .addAnswer(
    [
      "Selecciona cuál es el caso: ",
      "1- Impresora no imprime",
      "2- No permite realizar procedimientos",
      "3- Equipo sin conexión o navegación",
      "4- Balanza no pesa o descalibrada",
      "5- Datafono dice pos sin conexión",
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
      const userInput = ctx.body.toLowerCase();
      const optionsLineal = ["1", "2", "3", "4", "5"];

      const optionValida = optionsLineal.some((option) =>
        userInput.includes(option.toLowerCase())
      );

      if (!optionValida) {
        return fallBack();
      }
      console.log("mensaje entrante", ctx.body);
      ticketData.issue = `Problema en Lineal de Cajas: ${ctx.body}`;
    }
  )
  .addAnswer(
    ["Escribe una breve descripción del caso: "],
    { capture: true },
    async (ctx) => {
      let imageFilePath = null;

      if (ctx.message && ctx.message.imageMessage) {
        imageFilePath = await saveImage(ctx.message.imageMessage);
        ticketData.description =
          ctx.message.imageMessage.caption || "Imagen recibida sin descripción";
        ticketData.images.push(imageFilePath); // Agrega el archivo al arreglo
      }

      console.log("descripción lineal: ", ticketData.description, imageFilePath);
      ticketData.title = `Ticket de ${ticketData.area} - ${ticketData.issue}`;
      await createGLPITicket(ticketData);
    }
  )
  .addAnswer("En un promedio de 10 min recibiras respuesta");
// opciones para recibo 
const Recibo = addKeyword(["Recibo", "recibo"])
  .addAnswer(
    [
      "Selecciona cuál es el caso: ",
      "1- Equipo no enciende",
      "2- Impresora no imprime",
      "3- Equipo sin conexión o navegación",
      "4- Sin acceso a SIEZA InterPrice",
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
      const reciboOption = ctx.body.toLowerCase();
      const optionsRecibo = ["1", "2", "3", "4"];

      const optionValida = optionsRecibo.some((option) =>
        reciboOption.includes(option.toLowerCase())
      );

      if (!optionValida) {
        return fallBack();
      }
      console.log("mensaje entrante", ctx.body);
      ticketData.issue = `Problema en Recibo: ${ctx.body}`;
    }
  )
  .addAnswer(
    ["Escribe una breve descripción del caso: "],
    { capture: true },
    async (ctx) => {
      let imageFilePath = null;
// captura la imgen y la descripcion 
      if (ctx.message && ctx.message.imageMessage) {
        imageFilePath = await saveImage(ctx.message.imageMessage);
        ticketData.description =
          ctx.message.imageMessage.caption || "Imagen recibida sin descripción";
        ticketData.images.push(imageFilePath); // Agrega el archivo al arreglo
      }

      console.log("descripción admin: ", ticketData.description, imageFilePath);
      ticketData.title = `Ticket de ${ticketData.area} - ${ticketData.issue}`;
      await createGLPITicket(ticketData);
    }
  )
  .addAnswer("En un promedio de 10 min recibiras respuesta");

const CCTV = addKeyword(["CCTV", "Cctv", "cctv"])
  .addAnswer(
    [
      "Selecciona cuál es el caso: ",
      "1- Alarmas",
      "2- Cámaras",
      "3- DVR",
      "4- Televisores",
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
      const CCTVOption = ctx.body.toLowerCase();
      const optionsCCTV = ["1", "2", "3", "4"];

      const optionValida = optionsCCTV.some((option) =>
        CCTVOption.includes(option.toLowerCase())
      );

      if (!optionValida) {
        return fallBack();
      }
      console.log("mensaje entrante", ctx.body);
      ticketData.issue = `Problema en CCTV: ${ctx.body}`;
    }
  )
  .addAnswer(
    ["Escribe una breve descripción del caso: "],
    { capture: true },
    async (ctx) => {
      let imageFilePath = null;

      if (ctx.message && ctx.message.imageMessage) {
        imageFilePath = await saveImage(ctx.message.imageMessage);
        ticketData.description =
          ctx.message.imageMessage.caption || "Imagen recibida sin descripción";
        ticketData.images.push(imageFilePath); // Agrega el archivo al arreglo
      }

      console.log("descripción admin: ", ticketData.description, imageFilePath);
      ticketData.title = `Ticket de ${ticketData.area} - ${ticketData.issue}`;
      await createGLPITicket(ticketData);
    }
  )
  .addAnswer("En un promedio de 10 min recibiras respuesta");

const main = async () => {
  const adapterDB = new MySQLAdapter({
    host: MYSQL_DB_HOST,
    user: MYSQL_DB_USER,
    database: MYSQL_DB_NAME,
    password: MYSQL_DB_PASSWORD,
    port: MYSQL_DB_PORT,
  });
  const adapterFlow = createFlow([
    primerFiltro,
    AdminFiltro,
    Lineal,
    Recibo,
    CCTV,
  ]);
  const adapterProvider = createProvider(BaileysProvider);
  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });
  QRPortalWeb();
};

main();
