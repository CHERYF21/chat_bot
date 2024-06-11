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
const GLPI_API_URL = "http://10.21.90.7:8200/apirest.php/";
const GLPI_USER_TOKEN = "QVniFo9pZ5Cnwh981N1ynXxfqJygsW5FkDTGTvOg";
const GLPI_API_TOKEN = "eEvEVj8zPOvMKcYHJiEpza0KqprRm1X6MzWiJBdN";


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
      "Error iniciando sesiÃ³n en GLPI:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};

// almacena la data que ingresa el usuario
const ticketData = {
  title: "",
  description: "",
  sede: "",
  area: "",
  issue: "",
  usuario:"",
  telefono:"",
  images: [],
};

// crea ticket en el GLPI
const createGLPITicket = async (ticketData) => {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    console.error("No se pudo obtener el session_token");
    return null;
  }

  try {
    let imageHtml = "";
    if (ticketData.images.length > 0) {
      imageHtml = ticketData.images
        .map((imagePath) => {
          return `<p><img src="data:image/jpeg;base64,${fs.readFileSync(
            imagePath,
            { encoding: "base64" }
          )}" alt="Imagen adjunta"></p>`;
        })
        .join("");
    }

    const input = {
      input: {
        name: ticketData.title,
        content: `${ticketData.description}\n${imageHtml}`, // Agregar las imÃ¡genes al campo "content"
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
    return response.data.id;
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
  const stream = await downloadContentFromMessage(message, "image"); //en la carpeta image
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  const filePath = path.join(__dirname, "images", `${Date.now()}.jpg`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

//respuesta al primer mensaje HOLA
const infoUser = addKeyword([
  "hola",
  "ola",
  "Buenos dÃ­as",
  "buenos dias",
  "buenas tardes",
  "dias",
  "buenos",
  "dÃ­as",
  "buenas",
  "dias",
  "holi",
  "ayuda"

])
  .addAnswer(
    ["Bienvenido a soporte TI ðŸ˜Š", "ingresa tu nombre completo: "],
    { capture: true },
    (ctx, { fallBack }) => {
      const nombre = ctx.body.trim();
      if (!nombre || nombre.length < 4) {
        return fallBack();
      }
      ticketData.usuario = `Enviado por: ${nombre}`;

      const phoneNumbre = ctx.from.split('@')[0];//captura el numero de cel
      ticketData.telefono = `Numero de celular: ${phoneNumbre}`
    } 
  )
  .addAnswer(
    [
      "Â¿De quÃ© sede te comunicas?",
      "001 - LA 33",
      "002 - SAN CRISTOBAL",
      "003 - POBLADO",
      "004 - RIONEGRO",
      "005 - SABANETA AVENIDA",
      "006 - INTERMEDIA",
      "007 - PRADO",
      "008 - SABANETA PARQUE",
      "009 - PEDREGAL",
      "010 - SAN JOAQUIN",
      "011 - FLORESTA",
      "012 - SAN MARCOS",
      "013 - LAURELES",
      "014 - ADMIN"
    ],
    { capture: true },
    (ctx, { fallBack }) => {
      const userInput = ctx.body.toLowerCase().trim();
      const sedeNombres = {
        "001": "LA 33",
        "002": "SAN CRISTOBAL",
        "003": "POBLADO",
        "004": "RIONEGRO",
        "005": "SABANETA AVENIDA",
        "006": "INTERMEDIA",
        "007": "PRADO",
        "008": "SABANETA PARQUE",
        "009": "PEDREGAL",
        "010": "SAN JOAQUIN",
        "011": "FLORESTA",
        "012": "SAN MARCOS",
        "013": "LAURELES",
        "014": "ADMIN"
      };

      if (sedeNombres[userInput]) { 
        const sedeName = sedeNombres[userInput];
        ctx.body = `${sedeName}`;
        ticketData.sede = ctx.body;
      }else{
        return fallBack();
      }
    }
  )
  .addAnswer(
    [
      "Ingresa el Ã¡rea donde se presenta el inconveniente: ",
      "Admin - GH",
      "Cajas",
      "Recibo",
      "CCTV",
    ],
    { capture: true },
    (ctx, { fallBack }) => {
      const userMenu = ctx.body.toLowerCase().trim();
      const menu = ["Admin", "Cajas", "Recibo", "CCTV"];

      const opcionValida = menu.some((men) =>
        userMenu.includes(men.toLowerCase())
      );

      if (!opcionValida) {
        return fallBack();
      }
      ticketData.area = userMenu;
    }
  );

// opciones para administracion
const AdminFiltro = addKeyword(["Admin","Administracion","admon", "administracion","GH","gh","administrativo","Administrativo","014"])
  .addAnswer(
    [
      "Selecciona cuÃ¡l es el caso: ",
      "1 - Fallas en perifÃ©ricos (Teclado, Mouse, Impresora, EscÃ¡ner, Pantalla).",
      "2 - Equipo sin conexiÃ³n o navegaciÃ³n.",
      "3 - Sin acceso a siesa Enterprise u/o ERP.",
      "4 - Error en ERP.",
      "5 - Error impresora de flejes.",
      "6 - Equipo no funciona.",
      "7 - Error en Emisora.",
      "8 - Fallo general",
      "9 - Otros"

    ],
    { capture: true },
    async (ctx, { fallBack }) => {
      const respAdmin = ctx.body.trim();
      const optionsAdmin = {
        "1":"Fallas en perifÃ©ricos (Teclado, Mouse, Impresora, EscÃ¡ner, Pantalla).",
        "2":"Equipo sin conexiÃ³n o navegaciÃ³n.",
        "3":"Sin acceso a siesa Enterprise u/o ERP.",
        "4":"Error en ERP.",
        "5":"Error impresora de flejes.",
        "6":"Equipo no funciona.",
        "7":"Error en Emisora.",
        "8":"Fallo general",
        "9":"Otros"
      };

      if (optionsAdmin[respAdmin]) {
        const option = optionsAdmin[respAdmin];
        ctx.body =  `${option}`;
        ticketData.issue = `Problema en AdministraciÃ³n: ${ctx.body}`;
      }else{
        return fallBack();
      }
    }
  )
  .addAnswer(
    ["Envia *una sola imagen* con *descripcion* del problema: "],
    { capture: true },
    async (ctx, {flowDynamic}) => {
      let imageFilePath = null;

      if (ctx.message && ctx.message.imageMessage) {
        imageFilePath = await saveImage(ctx.message.imageMessage);
        ticketData.description =
          ctx.message.imageMessage.caption || "Imagen recibida sin descripciÃ³n";
        ticketData.images.push(imageFilePath); // Agrega el archivo al arreglo
      }

      ticketData.title = `Ticket de ${ticketData.area} 
       ${ticketData.issue}\n-
       ${ticketData.usuario}\n- 
       ${ticketData.sede}\n-
       ${ticketData.telefono}`;
      const ticketId = await createGLPITicket(ticketData);

      const responseMessage = ticketId
      ? `Caso registrado con Ã©xito, este es su nÃºmero de ticket: ${ticketId},  en breves nos comunicaremos con usted.`
      : "Hubo un error al registrar el caso. Por favor, intÃ©ntelo de nuevo.";

      await flowDynamic(responseMessage);
    }
  )
  .addAnswer("Para generar un nuevo ticket escribe 'Hola' ")

// opciones para lineal de cajas
const Lineal = addKeyword(["Cajas", "lineal de cajas","Lineal","lineal","Cajas","cajas"])
  .addAnswer(
    [
      "Selecciona cuÃ¡l es el caso: ",
      "1 - Fallas en perifÃ©ricos (Teclado, Mouse, Impresora, Balanza, Pantalla).",
      "2 - Equipo no funciona.",
      "3 - Equipo sin conexiÃ³n o navegaciÃ³n.",
      "4 - Error en datafonos.",
      "5 - Usuario no funciona.",
      "6 - Error en aplicativo pos.",
      "7 - Otros"
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
      const userInput = ctx.body.toLowerCase();
      const optionsLineal = {
        "1":"Fallas en perifÃ©ricos (Teclado, Mouse, Impresora, Balanza, Pantalla).",
        "2":"Equipo no funciona.", 
        "3":"Equipo sin conexiÃ³n o navegaciÃ³n.", 
        "4":"Error en datafonos.", 
        "5":"Usuario no funciona.",
        "6":"Error en aplicativo pos.",
        "7":"Otros"
      };

      if (optionsLineal[userInput]) {
        const opcion = optionsLineal[userInput];
        ctx.body = `${opcion}`
        ticketData.issue = `Problema en Lineal: ${ctx.body}`;
      }else{
        return fallBack();
      }
    }
  )
  .addAnswer(
    ["Envia *una sola imagen* con *descripcion* del problema: "],
    { capture: true },
    async (ctx, {flowDynamic}) => {
      let imageFilePath = null;

      if (ctx.message && ctx.message.imageMessage) {
        imageFilePath = await saveImage(ctx.message.imageMessage);
        ticketData.description =
          ctx.message.imageMessage.caption || "Imagen recibida sin descripciÃ³n";
        ticketData.images.push(imageFilePath); // Agrega el archivo al arreglo
      }

      ticketData.title = `Ticket de ${ticketData.area} 
      ${ticketData.issue}\n-
      ${ticketData.usuario}\n- 
      ${ticketData.sede}\n-
      ${ticketData.telefono}`;
      const ticketId = await createGLPITicket(ticketData);

      const responseMessage = ticketId
      ? `Caso registrado con Ã©xito, este es su nÃºmero de ticket: ${ticketId},  en breves nos comunicaremos con usted.`
      : "Hubo un error al registrar el caso. Por favor, intÃ©ntelo de nuevo.";

      await flowDynamic(responseMessage);
    }
  )
  .addAnswer("Para generar un nuevo ticket escribe 'Hola' ")
// opciones para recibo
const Recibo = addKeyword(["Recibo", "recibo"])
  .addAnswer(
    [
      "Selecciona cuÃ¡l es el caso: ",
      "1 - Equipo no enciende",
      "2 - Impresora no imprime",
      "3 - Equipo sin conexiÃ³n o navegaciÃ³n",
      "4 - Sin acceso a SIEZA InterPrice",
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
      const reciboOption = ctx.body.toLowerCase().trim();
      const optionsRecibo = {
        "1":"Equipo no enciende", 
        "2":"Impresora no imprime", 
        "3":"Equipo sin conexiÃ³n o navegaciÃ³n", 
        "4":"Sin acceso a SIEZA InterPrice"
      };

      if (optionsRecibo[reciboOption]) {
        const opcion = optionsRecibo[reciboOption];
        ctx.body = `${opcion}`;
        ticketData.issue = `Problema en Recibo: ${ctx.body}`;
      }else{
        return fallBack();
      }
    }
  )
  .addAnswer(
    ["Envia *una sola imagen* con *descripcion* del problema:  "],
    { capture: true },
    async (ctx, {flowDynamic}) => {
      let imageFilePath = null;
      // captura la imgen y la descripcion
      if (ctx.message && ctx.message.imageMessage) {
        imageFilePath = await saveImage(ctx.message.imageMessage);
        ticketData.description =
          ctx.message.imageMessage.caption || "Imagen recibida sin descripciÃ³n";
        ticketData.images.push(imageFilePath); // Agrega el archivo al arreglo
      }

      ticketData.title = `Ticket de ${ticketData.area} 
      ${ticketData.issue}\n-
      ${ticketData.usuario}\n- 
      ${ticketData.sede}\n-
      ${ticketData.telefono}`;
      const ticketId = await createGLPITicket(ticketData);

      const responseMessage = ticketId
      ? `Caso registrado con Ã©xito, este es su nÃºmero de ticket: ${ticketId},  en breves nos comunicaremos con usted.`
      : "Hubo un error al registrar el caso. Por favor, intÃ©ntelo de nuevo.";

      await flowDynamic(responseMessage);
    }
  )
  .addAnswer("Para generar un nuevo ticket escribe 'Hola' ")

// opciones menus cctv
const CCTV = addKeyword(["CCTV", "Cctv", "cctv"])
  .addAnswer(
    [
      "Selecciona cuÃ¡l es el caso: ",
      "1- Alarmas",
      "2- CÃ¡maras",
      "3- DVR",
      "4- Televisores",
    ],
    { capture: true },
    async (ctx, { fallBack }) => {
      const CCTVOption = ctx.body.toLowerCase().trim();
      const optionsCCTV = {
        "1":"Alarmas", 
        "2":"CÃ¡maras", 
        "3":"DVR", 
        "4":"Televisores"
      };

      if (optionsCCTV[CCTVOption]) {
        const opcion = optionsCCTV[CCTVOption];
        ctx.body = `${opcion}`;
        ticketData.issue = `Problema en CCTV: ${ctx.body}`;
      }else{
        return fallBack();
      }
    }
  )
  .addAnswer(
    ["Envia *una sola imagen* con *descripcion* del problema: "],
    { capture: true },
    async (ctx,{flowDynamic}) => {
      let imageFilePath = null;

      if (ctx.message && ctx.message.imageMessage) {
        imageFilePath = await saveImage(ctx.message.imageMessage);
        ticketData.description =
          ctx.message.imageMessage.caption || "Imagen recibida sin descripciÃ³n";
        ticketData.images.push(imageFilePath); // Agrega el archivo al arreglo
      }

      ticketData.title = `Ticket de ${ticketData.area} 
      ${ticketData.issue}\n-
      ${ticketData.usuario}\n- 
      ${ticketData.sede}\n-
      ${ticketData.telefono}`;
      const ticketId = await createGLPITicket(ticketData);

      const responseMessage = ticketId
      ? `Caso registrado con Ã©xito, este es su nÃºmero de ticket: ${ticketId}, en breves nos comunicaremos con usted.`
      : "Hubo un error al registrar el caso. Por favor, intÃ©ntelo de nuevo.";

      await flowDynamic(responseMessage);
    }
  )
  .addAnswer("Para generar un nuevo ticket escribe 'Hola' ")

const main = async () => {
  const adapterDB = new MySQLAdapter({
    host: MYSQL_DB_HOST,
    user: MYSQL_DB_USER,
    database: MYSQL_DB_NAME,
    password: MYSQL_DB_PASSWORD,
    port: MYSQL_DB_PORT,
  });
  const adapterFlow = createFlow([infoUser, AdminFiltro, Lineal, Recibo, CCTV]);
  const adapterProvider = createProvider(BaileysProvider);
  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });
  QRPortalWeb();
};

main();
