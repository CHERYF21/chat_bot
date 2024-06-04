const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MySQLAdapter = require('@bot-whatsapp/database/mysql');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

/**
 * Declaramos las conexiones de MySQL
 */
const MYSQL_DB_HOST = "localhost";
const MYSQL_DB_USER = "root";
const MYSQL_DB_PASSWORD = "Wmurillo66*";
const MYSQL_DB_NAME = "chat_org";
const MYSQL_DB_PORT = "3306";

/**
 * Configuración de GLPI
 */
const GLPI_API_URL = 'http://127.0.0.1:8200/apirest.php';
const GLPI_API_TOKEN = 'PSeaV8EpdZnZzRxMAg3kJsilbBkq6BhdF8zucnlX';

const createGLPITicket = async (title, description) => {
    try {
        const response = await axios.post(`${GLPI_API_URL}/ticket`, {
            input: {
                name: title,
                content: description,
                status: 1  // Estado del ticket (1 para nuevo)
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `user_token ${GLPI_API_TOKEN}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error creando ticket en GLPI:', error.response ? error.response.data : error.message);
        return null;
    }
};
// funcion para almacenar la imagen localmente antes de enviarla a la BD 
const saveImage = async (message) => {
    const stream = await downloadContentFromMessage(message, 'image');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    const filePath = path.join(__dirname, 'images', `${Date.now()}.jpg`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
};

// respuesta al mensaje hola 
const primerFiltro = addKeyword(['hola', 'ola', 'Buenos días', 'buenos dias', 'buenas tardes'])
    .addAnswer(['Bienvenido a soporte TI', 'atenderemos tu solicitud'])
    .addAnswer(['¿De qué sede te comunicas?',
        'La 33',
        'Floresta',
        'Pedregal',
        'Sabaneta parque',
        'Sabaneta avenida',
        'Almendros',
        'San Joaquin',
        'Rionegro',
        'San Antonio De Prado'], { capture: true }, (ctx, { fallBack }) => {
            const userInput = ctx.body.toLowerCase();
            const sedes = [
                'la 33',
                'floresta',
                'pedregal',
                'sabaneta parque',
                'sabaneta avenida',
                'almendros',
                'san joaquin',
                'rionegro',
                'san antonio de prado'];

            const sedevalida = sedes.some(sede => userInput.includes(sede.toLowerCase()));

            if (!sedevalida) {
                return fallBack();
            }
            console.log('mensaje entrante', ctx.body);
        })
    .addAnswer(['Ingresa el área donde se presenta el inconveniente: ',
        'Administración',
        'Lineal de cajas',
        'Recibo',
        'CCTV'
    ]);

// opciones para administracion 
const AdminFiltro = addKeyword(['Administración', 'administracion'])
    .addAnswer(['Selecciona cuál es el caso: ',
        '1- Impresora no imprime',
        '2- Equipo sin conexión o navegación',
        '3- Sin acceso a SIEZA Interprice',
        '4- Monarch no imprime',
        '5- Equipo no enciende',
        '6-Emisora no suena'], { capture: true }, async (ctx, { fallBack }) => {
            const respAdmin = ctx.body.trim();
            const optionsAdmin = [
                '1',
                '2',
                '3',
                '4',
                '5',
                '6'
            ];
            const responseValida = optionsAdmin.some(option => respAdmin.includes(option.toLowerCase()));

            if (!responseValida) {
                return fallBack();
            }
            const AdminSelection = ctx.body;
            console.log("respuesta admin select",AdminSelection);
            await createGLPITicket('Problema en Administración', ctx.body);
            
        })
    .addAnswer(["Envia una imagen con descripcion del problema: "], { capture: true }, async (ctx) => {
        let DescAdmin = ctx.body;
        let imageFilePath = null;

        if(ctx.message && ctx.message.imageMessage){
            imageFilePath = await saveImage(ctx.message.imageMessage);
            DescAdmin = ctx.message.imageMessage.caption || 'imagen recinida sin descripcion';
        }
        console.log("descripción admin: ", DescAdmin);
        await createGLPITicket('Descripción del problema en Administracion: ', ctx.body);
    }).addAnswer('Caso registrado con exito en un promedio de 10 min recibira una respuesta')

// opciones para lineal de cajas 
const Lineal = addKeyword(['Lineal de cajas', 'lineal de cajas',"Lineal", "lineal", "cajas"])
    .addAnswer(['Selecciona cuál es el caso: ',
        '1- Impresora no imprime',
        '2- No permite realizar procedimientos',
        '3- Equipo sin conexión o navegación',
        '4- Balanza no pesa o descalibrada',
        '5- Datafono dice pos sin conexión'
    ], { capture: true }, async (ctx, { fallBack }) => {
        const userInput = ctx.body.toLowerCase();
        const optionsLineal = [
            '1',
            '2',
            '3',
            '4',
            '5'
        ];

        const optionValida = optionsLineal.some(option => userInput.includes(option.toLowerCase()));

        if (!optionValida) {
            return fallBack();
        }
        console.log('mensaje entrante', ctx.body);
        await createGLPITicket('Problema en Lineal de Cajas', ctx.body);
    })
    .addAnswer(['Escribe una breve descripción del caso: '], { capture: true }, async (ctx) => {
        console.log("descripción: ", ctx.body);
        await createGLPITicket('Descripción del problema en Lineal de Cajas', ctx.body);
    });

// Opciones para recibo
const Recibo = addKeyword(['Recibo', 'recibo'])
    .addAnswer(['Selecciona cuál es el caso: ',
        '1- Equipo no enciende',
        '2- Impresora no imprime',
        '3- Equipo sin conexión o navegación',
        '4- Sin acceso a SIEZA InterPrice'
    ], { capture: true }, async (ctx, { fallBack }) => {
        const reciboOption = ctx.body.toLowerCase();
        const optionsRecibo = [
            '1',
            '2',
            '3',
            '4'
        ];

        const optionValida = optionsRecibo.some(option => reciboOption.includes(option.toLowerCase()));

        if (!optionValida) {
            return fallBack();
        }
        console.log('mensaje entrante', ctx.body);
        await createGLPITicket('Problema en Recibo', ctx.body);
    })
    .addAnswer(['Escribe una breve descripción del caso: '], { capture: true }, async (ctx) => {
        console.log("descripción: ", ctx.body);
        await createGLPITicket('Descripción del problema en Recibo', ctx.body);
    });

// Opciones para CCTV
const CCTV = addKeyword(['CCTV', 'Cctv', 'cctv'])
    .addAnswer(['Selecciona cuál es el caso: ',
        '1- Alarmas',
        '2- Cámaras',
        '3- DVR',
        '4- Televisores'
    ], { capture: true }, async (ctx, { fallBack }) => {
        const CCTVOption = ctx.body.toLowerCase();
        const optionsCCTV = [
            '1',
            '2',
            '3',
            '4'
        ];

        const optionValida = optionsCCTV.some(option => CCTVOption.includes(option.toLowerCase()));

        if (!optionValida) {
            return fallBack();
        }
        console.log('mensaje entrante', ctx.body);
        await createGLPITicket('Problema en CCTV', ctx.body);
    })
    .addAnswer(['Escribe una breve descripción del caso: '], { capture: true }, async (ctx) => {
        console.log("descripción: ", ctx.body);
        await createGLPITicket('Descripción del problema en CCTV', ctx.body);
    })
    .addAnswer(['Escribe una breve descripción del caso: '], { capture: true }, (ctx) => {
        console.log("descripción: ", ctx.body);
    })


const main = async () => {
    const adapterDB = new MySQLAdapter({
        host: MYSQL_DB_HOST,
        user: MYSQL_DB_USER,
        database: MYSQL_DB_NAME,
        password: MYSQL_DB_PASSWORD,
        port: MYSQL_DB_PORT,
    });
    const adapterFlow = createFlow([primerFiltro, AdminFiltro, Lineal, Recibo, CCTV]);
    const adapterProvider = createProvider(BaileysProvider);
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });
    QRPortalWeb();
}

main();
