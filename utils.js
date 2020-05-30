const { CountryCodes, Countries } = require('./constants');
shuffleArray( Countries );

function randomBtwn(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function sleep( ms ){
    return new Promise( resolve => setTimeout( resolve, ms) );
}

// array1 ==> target array2 ===> source
function mergeArrays(array1, array2) {
    var result_array = [];
    var arr = array1.concat(array2);
    var len = arr.length;
    var assoc = {};

    while(len--) {
        var item = arr[len];

        if(!assoc[item]) 
        { 
            result_array.unshift(item);
            assoc[item] = true;
        }
    }

    return result_array;
}

async function executeAfter(ms, callback){
    await sleep(ms);
    return callback();
}

function getRandomIndexUpto( num ) {
    return Math.floor( Math.random() * num );
}

function randomSizeStringWithCustomPossibles( len, possibles ) {
    const possiblesLength = possibles.length;
    let str = '';
    for( let i=0; i<len; i++){
        str = str + possibles.charAt( getRandomIndexUpto(possiblesLength) );
    }
    return str;
}

function randomString( len ){
    const possibles = 'qwertyuiopasdfghjklzxcvbnm';
    return randomSizeStringWithCustomPossibles( len, possibles );
}

function randomNumber( len, mustBeProper = false ){
    const possibles = '1234509876';
    const val = parseInt( randomSizeStringWithCustomPossibles( len, possibles ) );
    if( mustBeProper ){
        const _str = '' + val;
        if( _str.length !== len ){
            const val2 = randomSizeStringWithCustomPossibles( len - _str.length, possibles );
            return parseInt( '' + val + val2 );
        }
    }
    return val;
}

function randomeSecurePassword( len ) {
    const possibles = '@#$^QWERTYUIOPASD1029837465FGHJKLZXCVBNM@#$^qazwsxedcrfvtgbyhnujmikolp1029384756@#$^';
    return randomSizeStringWithCustomPossibles( len, possibles);
}

function randomGender() {
    return ( Math.floor(Math.random() * 10 ) ) > 5 ? "female" : "male";
}

function randomCountry() {
    return Countries[ randomBtwn(0, Countries.length)];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function getCodeFromCountry( country ){
    return CountryCodes[ country ];
}

module.exports = {
    randomBtwn,
    randomNumber,
    randomString,
    randomSizeStringWithCustomPossibles,
    getRandomIndexUpto,
    sleep,
    executeAfter,
    randomGender,
    randomCountry,
    shuffleArray,
    mergeArrays,
    randomeSecurePassword,
    getCodeFromCountry
}