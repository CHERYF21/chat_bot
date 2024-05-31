const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MySQLAdapter = require('@bot-whatsapp/database/mysql')

/**
 * Declaramos las conexiones de MySQL
 */
const MYSQL_DB_HOST = "localhost";
const MYSQL_DB_USER = "root";
const MYSQL_DB_PASSWORD = "root";
const MYSQL_DB_NAME = "chat_org";
const MYSQL_DB_PORT = "3306";



const primerFiltro = addKeyword(['hola', 'ola', 'Buenos días', 'buenosc', 'buenas tardes'])
    .addAnswer(['Bienvenido a sopporte TI', 'tenderemos tu solicitud'])
    .addAnswer(['De que sede te comunicas?',
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
                'almendros'];

            const sedevalida = sedes.some(sede => userInput.includes(sede.toLowerCase()));

            if (!sedevalida) {
                return fallBack()
            }
            console.log('mensaje entrante', ctx.body)
        })
    .addAnswer(['ingresa el area donde se presenta el inconveniente: ',
        'Administracion',
        'Lineal de cajas',
        'Recibo',
        'CCTV'
    ])
// opciones para administracion 
const AdminFiltro = addKeyword(['Administracion','administracion'])
    .addAnswer(['Selecciona cual es el caso: ',
        '1- Impresora no imprime',
        '2- Equipo sin conexion o navegacion',
        '3- Sin acceso a SIEZA Interprice',
        '4- Monarch no imprime',
        '5- Equipo no enciende',
        '6-Emisora no suena'], { capture: true }, (ctx, { fallBack }) => {
            const respAdmin = ctx.body.trim();
            const optionsAdmin = [
                '1',
                '2',
                '3',
                '4',
                '5',
                '6'
            ];
            const responseValida = optionsAdmin.some(option => respAdmin.includes(option.toLocaleLowerCase()));

            if (!responseValida) {
                return fallBack()
            }
            console.log("respuesta admin", ctx.body)
        })
    .addAnswer(["escribe una descripcion del problema: "], { capture: true }, (ctx) => {
        console.log("descripcion: ", ctx.body)
    })
// opciones para lineal de cajas 
const Lineal = addKeyword(['Lineal cajas','lineal cajas'])
    .addAnswer(['Selecciona cual es el caso: ',
        '1- Impresora no imprime',
        '2- No permirte realizar procediminetos',
        '3- Equipo sin conexion o navegacion',
        '4- Balanza no pesa o descalibrada',
        '5- Datafono dice pos sin conexion'
    ], { capture: true }, (ctx, { fallBack }) => {
        const userInput = ctx.body.toLowerCase();
        const sedes = [
            '1',
            '2',
            '3',
            '4',
            '5',
        ];

        const sedevalida = sedes.some(sede => userInput.includes(sede.toLowerCase()));

        if (!sedevalida) {
            return fallBack()
        }
        console.log('mensaje entrante', ctx.body)
    })
    .addAnswer(['Escribe una breve descripcion del caso: '])
// opciones para recibo 
const Recibo = addKeyword(['Recibo','recibo'])
    .addAnswer(['Selecciona cual es el caso: ',
        '1- Equipo no enciende',
        '2- Impresora no imprime',
        '3- Equipo sin conexion o navegacion',
        '4- Sin acceso a SIEZA InterPrice'
    ], { capture: true }, (ctx, { fallBack }) => {
        const reciboOption = ctx.body.toLowerCase();
        const optionrecibo = [
            '1',
            '2',
            '3',
            '4'
        ];

        const Optionvalida = optionrecibo.some(opcion => reciboOption.includes(opcion.toLowerCase()));

        if (!Optionvalida) {
            return fallBack()
        }
        console.log('mensaje entrante', ctx.body)
    })
    .addAnswer(['Escribe una breve descripcion del caso: '])

const CCTV = addKeyword(['CCTV', 'Cctv','cctv'])
    .addAnswer(['Selecciona cual es el caso: ',
        '1- Alarmas',
        '2- Camaras',
        '3- DVR',
        '4- Televisores'
    ], { capture: true }, (ctx, { fallBack }) => {
        const CCTVOption = ctx.body.toLowerCase();
        const optionCCTV = [
            '1',
            '2',
            '3',
            '4'
        ];

        const Optionvalida = optionCCTV.some(opcion => CCTVOption.includes(opcion.toLowerCase()));

        if (!Optionvalida) {
            return fallBack()
        }
        console.log('mensaje entrante', ctx.body)
    })
    .addAnswer(['Escribe una breve descripcion del caso: '])

const main = async () => {
    const adapterDB = new MySQLAdapter({
        host: MYSQL_DB_HOST,
        user: MYSQL_DB_USER,
        database: MYSQL_DB_NAME,
        password: MYSQL_DB_PASSWORD,
        port: MYSQL_DB_PORT,
    })
    const adapterFlow = createFlow([primerFiltro, AdminFiltro, Lineal, Recibo, CCTV])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
