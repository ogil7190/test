const { insertIntoCollection, getTaskByName } = require('../db.js');
const { executeProtocol } = require('./protocolExecutor.js');
const { Collections } = require('../constants');
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');

async function executeTask( taskName, global ) {
    const task = await getTaskByName( taskName );
    
    if( !task ) return false;
    
    const browserOptions = task.options;
    const protocols = task.protocols;

    const browser = await startBrowserWithOptions( browserOptions );
    
    for( let i=0; i<protocols.length; i++){
        try {
            await executeProtocol( protocols[i], browser, global);
        } catch( error ){
            console.log( error );
            await logError( error, global, protocols[i] );
            console.log('Stopping execution because error occured');
            return false;
        }
    }
    return true;
}

async function logError( error, global, protocol){
    const collection = Collections.COLLECTION_LOGS;
    await insertIntoCollection({
        error: error,
        token: global.token,
        protocol
    }, collection);
}

async function startBrowserWithOptions( options ){
    puppeteer.use(pluginStealth());
    return await puppeteer.launch({ ...options});
}

module.exports = {
    executeTask
};