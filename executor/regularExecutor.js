const { getWorksForMe, markOnline, readOverride, requestingScreenShots } = require('../db');
const { executeWorks } = require('./worksExecutor');
const { Variables } = require('../constants');
const { mergeArrays } = require('../utils');

const INTERVAL = 30 * 1000;
let regularCheckInterval = null;

async function check(global){
    console.log( 'CHECKING', process.env );
    let token = global[ Variables.TOKEN ];
    token = parseInt( token.substring(1, token.length) );
    const isFree = global.works.length > 0 ? false : true;

    const isOverridden = await readOverride(token, isFree);
    if( isOverridden ){
        global[ Variables.IS_OVERRIDDEN ] = isOverridden;
        return;
    }

    const count = await requestingScreenShots( token );
    if( count > 0 ){
        global[ Variables.STORE_SS ] = count;
    }

    const worksForMe = await getWorksForMe(token, isFree);
    const eligibleWorksForMe = getEligibleWorksForMe( global, worksForMe );
    
    if( eligibleWorksForMe.length > 0 ){
        global.works = mergeArrays( global.works, eligibleWorksForMe);
    }

    const isWorking = global.isWorking;
    if( !isWorking && global.works.length > 0 ) {
        executeWorks( global );
    }

    await markOnline( token );
}

function getEligibleWorksForMe( global, allWorks ){
    const worksDone = global.worksDone;
    const eligibleWorks = [];
    const works = global.works;

    for( let i=0; i<allWorks.length; i++){
        const _work = allWorks[i];
        const count = worksDone[ _work.name ] || works.indexOf( _work.name ) >= 0 ? 1 : 0;
        const ifLimitFollowed = _work.limit ? count < _work.limit : true;

        if( ifLimitFollowed ){
            eligibleWorks.push( _work.name );
        }
    }
    return eligibleWorks;
}

const stopRegularCheck = () => {
    console.log( '!! STOPPING REGULAR CHECK !!' );
    clearInterval( regularCheckInterval );
}

const regularCheck = async ( global ) => {
    console.log( 'REGULAR CHECK' );
    await check( global );
    return await new Promise(() => {
        regularCheckInterval = setInterval( async() => {
              await check( global );
        }, INTERVAL);
    });
};

module.exports = {
    regularCheck,
    stopRegularCheck
}