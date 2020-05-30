const { getWorkerByToken, insertIntoCollection } = require('./db');
const { Collections, Variables } = require('./constants');
const { generateIdentity } = require('./services/generateIdentity');

async function initSelf() {
    const token = process.env.TOKEN;
    const common = {
        works: [],
        worksDone: {},
        [Variables.TOKEN]: token
    };

    if( token ){
        let workerData = await getWorkerByToken( token );
        if( workerData === null ){
            const identity = generateIdentity();
            await insertIntoCollection({ ...identity, token}, Collections.COLLECTION_WORKERS);
            Object.assign( common, identity );
        } else {
            Object.assign( common, workerData );
        }
        return common;
    } else {
        process.exit();
    }
}

module.exports = {
    initSelf
}