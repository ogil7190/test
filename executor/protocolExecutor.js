const { randomBtwn, sleep } = require('../utils');
const { solveCaptcha } = require('../services/captchaSolver');
const { generateIdentity } = require('../services/generateIdentity');
const { getProtcolByName, insertIntoCollection, getLastInsertedToken } = require('../db');
const { Actions, Variables, RandomIdentity, Collections } = require('../constants');

let _actions_ = {};
let _global_ = {};
let _browser_ = {};

async function executeProtocol( _protocol, browser, global ){
    try {
        const protocol = await getProtcolByName( _protocol );
    
        _global_ = global;
        _browser_ = browser;
        const useExistingSession = protocol.useExistingSession;
        const saveSession = protocol.saveSession;
        let session;
        
        if( useExistingSession ){
            session = global[ protocol.session ] || await browser.newPage();
        } else {
            session = await browser.newPage();
        }
        
        _actions_ = protocol.actions;
        const performs = _actions_.performs;
        
        if( performs ){
            await executePerforms( performs, _actions_, session );
        }
    
        Object.assign( global, _global_);
    
        if( saveSession ){
            global[ protocol.session ] = session;
            console.log( "PROTOCOL SUCCESS SAVED" );
        } else {
            session.close();
        }
        console.log( "PROTOCOL COMPLETED" );
    } catch( error ) {
        console.log( 'Protocol Execution error', error);
        await insertIntoCollection({
            error,
            protocol: _protocol,
        }, Collections.COLLECTION_LOGS );
    }
}

async function handleOverride(){
    const isOverrideen = _global_[ Variables.IS_OVERRIDDEN ];
    if( isOverrideen ){
        console.log( 'OVERRIDDEN' );
        throw new Error("Overridden");
    }
}

async function handleStoreSS( session ){
    const totalCount = parseInt( _global_[ Variables.STORE_SS ]);
    const count = _global_[ Variables.SS_COUNT ] || 0;

    if( count < totalCount ){
        console.log( 'SCREENSHOTING' );
        _global_[ Variables.SS_COUNT ] = count + 1;
        await output({
            fileName: `ss-${count}.png`,
            fullPage: false
        },session )
    }
    else if( totalCount > 0 ){
        _global_[ Variables.STORE_SS ] = 0;
        _global_[ Variables.SS_COUNT ] = 0;
    }
}

async function executePerforms( performs, actions, session ){
    let result;
    for( let i=0; i<performs.length; i++ ){
        await handleOverride();
        const action = actions[ performs[i] ];
        if( action ){
            result = await performAction( action, session );
        }

        if( action.performs ){
            result = await executePerforms( action.performs, actions, session );
        }
        await handleStoreSS(session);
    }
    return result;
}

async function goto( action, session ){
    console.log( 'ACTION GOTO' );
    const timeout = action.timeout || 0;
    const skipLoading = action.skipLoading;
    const url = action.url;
    await session.setDefaultNavigationTimeout(timeout);
    session.goto( url );
    if( !skipLoading ){
        await session.waitForNavigation();
    }
}

async function navigation( action, session ){
    console.log( 'ACTION NAVIGATION' );
    await session.waitForNavigation();
}

function resolveVariable( variable, source ){
    if( source ){
        const _source = _global_[source];
        return _source[variable];
    } else {
        return _global_[variable];
    }
}

function setVariable( variable, value, source ){
    if( source ){
        const _source = _global_[source];
        _source[ variable ] = value;
    } else {
        _global_[variable] = value;
    }
}

async function input( action, session){
    console.log( 'ACTION INPUT' );
    const params = action[ Actions.ACTION_TYPE_INPUT ];
    const key = action.key;
    const min = params.min || 30;
    const max = params.max || 120;
    const isVariable = params.isVariable || false;
    const options = { delay : randomBtwn( min, max) };
    const element = await session.$(key);
    if( isVariable ){
        await element.type( resolveVariable(params.value, params.source), options);
    } else {
        await element.type( params.value, options);
    }
}

async function select(action, session){
    console.log( 'ACTION SELECT' );
    const params = action[ Actions.ACTION_TYPE_SELECT ];
    const key = action.key;
    const isVariable = params.isVariable || false;
    const value = isVariable ? resolveVariable(params.value, params.source) : params.value;
    const element = await session.$(key);
    element.select( value );
}

async function click( action, session ){
    console.log( 'ACTION CLICK' );
    const params = action[ Actions.ACTION_TYPE_CLICK ];
    const key = action.key;
    const min = params.min || 30;
    const max = params.max || 120;
    const options = { delay : randomBtwn( min, max) };
    const element = await session.$(key);
    await element.click( params.value, options);
}

async function sleepAction( action ){
    console.log( 'ACTION SLEEP' );
    const params = action[ Actions.ACTION_TYPE_SLEEP ];
    const ms = params.ms || 0;
    if( ms ){
        await sleep( ms );
    } else {
        const min = params.min || 100;
        const max = params.max || 200;
        const time = randomBtwn( min, max );
        await sleep( time );
    }
}

async function evaluate( action, session ){
    console.log( 'ACTION EVALUATE' );
    const params = action[ Actions.ACTION_TYPE_EVALUATE ];
    const set = action.set;

    const returnedValue = await session.evaluate( ( params ) => {
        const key = params.key;
        const find = params.find;
        const index = params.index;
        const _return = params.return;
        const where = params.where;
        const not = params.not;
        const array = document.querySelectorAll( key );
        if( array ){
            if( find !== undefined ){
                for( let i=0; i<array.length; i++){
                    const item = array[i];
                    const property = item[find].indexOf(where);
                    const bool = not ? !property >=0 : property >=0;
                    if( bool ){
                        return item[find];
                    }
                }
            }

            if( index !== undefined ){
                const item = array[index];
                return item[_return];
            }
            
            return array[_return];
        }
    }, params);

    if( set ){
        console.log( 'Setting ' + set, returnedValue );
        setVariable(set, returnedValue, params.source);
    }
    return returnedValue;
}

async function condition( action, session ){
    console.log( 'ACTION CONDITION' );
    const gets = action.gets;
    const variables = {};

    let _keys = Object.keys(gets);
    for(let i=0; i<_keys.length; i++){
        const key = _keys[i];
        variables[ key ] = _global_[ gets[key] ];
    }

    const _else = action.else;
    const ifs = action.ifs;
    for(let i=0; i<ifs.length; i++){
        const _if = ifs[i];
       
        const gt = _if.gt;
        const lt = _if.lt;
        const gte = _if.gte;
        const lte = _if.lte;
        const e = _if.e;
        const ee = _if.ee;

        if(gt !== undefined){
            if( variables[ _if.variable ] > gt) return await executePerforms( _if.performs, _actions_, session );
        }
        else if(lt !== undefined) {
            if( variables[ _if.variable ] < lt) return await executePerforms( _if.performs, _actions_, session );
        }
        else if(lte !== undefined) {
            if( variables[ _if.variable ] <= lte) return await executePerforms( _if.performs, _actions_, session );
        }
        else if(gte !== undefined) {
            if( variables[ _if.variable ] >= gte) return await executePerforms( _if.performs, _actions_, session );
        }
        else if(e !== undefined) {
            if( variables[ _if.variable ] == e) return await executePerforms( _if.performs, _actions_, session );
        }
        else if(ee !== undefined) {
            if( variables[ _if.variable ] === ee) return await executePerforms( _if.performs, _actions_, session );
        }
    }
    return await executePerforms( _else.performs, _actions_, session );
}

async function output( action, session ){
    console.log( 'ACTION OUTPUT' );
    const fileName = action.fileName || 'ss.png';
    const fullPage = action.fullPage;
    await session.screenshot({path: `screenshots/${fileName}`, fullPage});
}

async function mouseUp( action, session) {
    console.log( 'ACTION MOUSEUP' );
    await session.mouse.move(action.x, action.y);
    await session.mouse.up();
}

async function mouseDown( action, session) {
    console.log( 'ACTION MOUSEDOWN' );
    await session.mouse.move(action.x, action.y);
    await session.mouse.down();
}

async function mouseMove( action, session) {
    console.log( 'ACTION MOUSEMOVE' );
    await session.mouse.move(action.x, action.y);
}

async function mouseClick( action, session) {
    console.log( 'ACTION MOUSECLICK' );
    const delay = action.delay || randomBtwn(0, 100);
    let repeat = action.repeat || 1;
    while( repeat > 0 ){
        await session.mouse.click(action.x, action.y, { delay });
        repeat = repeat - 1;
    }
}

async function keyPress( action, session) {
    console.log( 'ACTION KEYPRESS' );
    let repeat = action.repeat || 1;
    const isVariable = action.isVariable;
    let text = action.text;
    if( text && isVariable ){
        text = resolveVariable(text, action.source);
    }
    const delay = action.delay || randomBtwn(0, 100);
    while( repeat > 0 ){
        if( text ){
            await session.keyboard.press( null, { delay, text } );
        } else {
            await session.keyboard.press( action.key, { delay } );
        }
        repeat = repeat - 1;
    }
}

async function keyUp( action, session) {
    console.log( 'ACTION KEYUP' );
    await session.keyboard.up( action.key );
}

async function keyDown( action, session) {
    console.log( 'ACTION KEYDOWN' );
    await session.keyboard.down( action.key );
}

async function typeText( action, session ){
    console.log( 'ACTION TYPE-TEXT' );
    const text = action.text;
    const delay = action.delay || randomBtwn(0, 100);
    const isVariable = action.isVariable;
    if( isVariable ){
        const value = resolveVariable(text, action.source);
        await session.keyboard.type( value, { delay} );
    } else {
        await session.keyboard.type( text, { delay} );
    }
}

async function setViewport(action, session){
    console.log( 'ACTION SETVIEWPORT' );
    const width = action.width || 1440;
    const height = action.height || 730;
    await session.setViewport({ width, height });
}

async function captcha(action, session){
    console.log( 'ACTION SOLVE-CAPTCHA' );
    const options = action.options;
    await solveCaptcha(session, _browser_, options);
}

async function randomeIdentity(action){
    console.log( 'ACTION RANDOM-IDENTITY' );
    const defaults = {}
    const country = action.country;
    const gender = action.gender;
    const password = action.password;
    
    if( country ){
        defaults[ RandomIdentity.IDENTITY_COUNTRY ] = country;
    }

    if( gender ){
        defaults[ RandomIdentity.IDENTITY_GENDER ] = gender;
    }

    if( password ){
        defaults[ RandomIdentity.IDENTITY_PASSWORD ] = password;
    }

    const randomIdentity = generateIdentity( true, defaults);
    Object.assign( _global_, randomIdentity );
}

async function remoteJs(action, session){
    const code = action.code;
    eval( code );
}

async function writeDataIntoCollection( action ){
    console.log( 'ACTION WRITE-TO-COLLECTION' );
    const collection = action.collection;
    const set = action.set;
    const data = action.data;
    let _insert = {};
    for(let i=0; i<data.length; i++){
        const _item = data[i];
        let value;
        if( _item.isVariable ){
            value = resolveVariable(_item[ _item.var ], _item.source );
        } else {
            value = _item[ _item.var ];
        }
        _insert[ _item.var ] = value;
    }
    await insertIntoCollection(_insert, collection);
    if( set ){
        setVariable(set, _insert, action.source);
    }
}

async function generateToken( action ){
    console.log( 'ACTION GENERATE-TOKEN' );
    const set = action.set;
    const token = await getLastInsertedToken();
    if( token ){
        const newToken = 'u' + (parseInt( token.substring(1, token.length) ) + 1);
        if( set ){
            setVariable(set, newToken, action.source);
        }
    }
}

async function performAction( action, session ){
    switch( action.type ){
        case Actions.ACTION_TYPE_GOTO: return await goto( action, session );
        case Actions.ACTION_TYPE_SET_VIEWPORT: return await setViewport( action, session );
        case Actions.ACTION_TYPE_INPUT: return await input( action, session );
        case Actions.ACTION_TYPE_CLICK: return await click( action, session );
        case Actions.ACTION_TYPE_SELECT: return await select( action, session );
        case Actions.ACTION_TYPE_SLEEP: return await sleepAction( action );
        case Actions.ACTION_TYPE_OUTPUT: return await output( action, session );
        case Actions.ACTION_TYPE_NAVIGATION: return await navigation( action, session );
        case Actions.ACTION_TYPE_EVALUATE: return await evaluate( action, session );
        case Actions.ACTION_TYPE_CONDITION: return await condition( action, session );
        case Actions.ACTION_TYPE_MOUSE_DOWN: return await mouseDown( action, session );
        case Actions.ACTION_TYPE_MOUSE_UP: return await mouseUp( action, session );
        case Actions.ACTION_TYPE_MOUSE_CLICK: return await mouseClick( action, session );
        case Actions.ACTION_TYPE_MOUSE_MOVE: return await mouseMove( action, session );
        case Actions.ACTION_TYPE_KEY_PRESS: return await keyPress( action, session );
        case Actions.ACTION_TYPE_TYPE_TEXT: return await typeText( action, session );
        case Actions.ACTION_TYPE_KEY_UP: return await keyUp( action, session );
        case Actions.ACTION_TYPE_KEY_DOWN: return await keyDown( action, session );
        case Actions.ACTION_TYPE_REMOTE_JAVASCRIPT: return await remoteJs( action, session );
        case Actions.ACTION_TYPE_SETUP_RANDOM_INDENTITY: return await randomeIdentity(action);
        case Actions.ACTION_TYPE_SOLVE_CAPTCHA: return await captcha( action, session );
        case Actions.ACTION_TYPE_WRITE_DATA_INTO_COLLECTION: return await writeDataIntoCollection( action, session );
        case Actions.ACTION_TYPE_TOKEN: return await generateToken( action, session );
    }
}

module.exports = {
    executeProtocol
}