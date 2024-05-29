const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MySQLAdapter = require('@bot-whatsapp/database/mysql')

/**
 * Declaramos las conexiones de MySQL
 */
const MYSQL_DB_HOST = 'localhost'
const MYSQL_DB_USER = 'root'
const MYSQL_DB_PASSWORD = 'root'
const MYSQL_DB_NAME = 'chat_org'
const MYSQL_DB_PORT = '3306'



const primerFiltro = addKeyword(['hola', 'ola'])
    .addAnswer(['Bienvenido a sopporte TI', 'tenderemos tu solicitud'])
    .addAnswer(['De que sede te comunicas?',
                    'la 33',
                    'floresta',
                    'pedregal',
                    'sabaneta parque',
                    'sabaneta avenida',
                    'almendros'], {capture: true},(ctx, {fallBack}) => {
        const userInput = ctx.body.toLowerCase();
        const sedes = [
            'la 33',
            'floresta',
            'pedregal',
            'sabaneta parque',
            'sabaneta avenida',
            'almendros'];

        const sedevalida = sedes.some(sede => userInput.includes(sede.toLowerCase()));

        if(!sedevalida){
            return fallBack()
        }
            console.log('mensaje entrante', ctx.body)
    })
.addAnswer(['ingresa el area donde se presenta el inconveniente: ',
    '1- Administracion',
    '2- Lineal de cajas',
    '3- Lecibo',
    '4- CCTV'
])
const segundoFiltro = addKeyword(['1- Administracion','2- Lineal de cajas','3- Lecibo','4- CCTV'])
.addAnswer('sub menu siguientes')


const main = async () => {
    const adapterDB = new MySQLAdapter({
        host: MYSQL_DB_HOST,
        user: MYSQL_DB_USER,
        database: MYSQL_DB_NAME,
        password: MYSQL_DB_PASSWORD,
        port: MYSQL_DB_PORT,
    })
    const adapterFlow = createFlow([primerFiltro, segundoFiltro])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
