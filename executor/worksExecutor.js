const { getWorkByName, updateWorkDone, insertIntoCollection } = require('../db');
const { executeTask } = require('./taskExecutor');
const { Collections, Variables } = require('../constants');

async function logWorkFailure( workName ) {
    await insertIntoCollection( {
        'work-failure' : 'Something went wrong logged task failure earlier than this.',
        workName
    }, Collections.COLLECTION_LOGS);
}

async function logTaskFailure( taskName, work ) {
    await insertIntoCollection( {
        'task-failure' : 'Something went wrong logged task failure earlier than this.',
        taskName,
        work
    }, Collections.COLLECTION_LOGS);
}

async function pushWorkToHistory(workName, token) {
    await insertIntoCollection({
        work: workName,
        doneBy: token
    }, Collections.COLLECTION_WORK_HSITORY);
}

async function executeWorks( global ){
    global.isWorking = true;
    let success = true;
    let i = 0;

    while( global.works.length > 0 ){
        const actualWork = await getWorkByName( global.works[0] );
        const worksDone = global.worksDone;
        const count = worksDone[ global.works[0] ] || 0;
        const times = count + 1;
        
        global.worksDone[ global.works[0] ] = times;

        const ifLimitFollowed = actualWork.limit ? times < actualWork.limit : true;
        const repeat = ifLimitFollowed && actualWork.remaining > 0;
        const _work = global.works.shift();

        if( repeat ) {
            global.works.push( _work );
        }
        
        const tasks = actualWork.tasks;

        for( i=0; i<tasks.length; i++){
            const task = tasks[i];
            sucess = success && await executeTask(task, global);
            if( !success ){
                await logTaskFailure( task, _work );
                break;
            }
        }

        if( success ){
            const token = global[ Variables.TOKEN ];
            await pushWorkToHistory( _work, token);
        } else {
            await logWorkFailure( _work );
            break;
        }
    }
    
    global.isWorking = false;
}

module.exports = {
    executeWorks
}