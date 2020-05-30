const random_name = require('node-random-name');
const { Identity, RandomIdentity } = require('../constants');
const { randomGender, randomCountry, randomBtwn, randomString, randomNumber, randomeSecurePassword } = require('../utils');

function generateIdentity( isRandom = false, defaults = {} ){
    const _Identity = isRandom ? RandomIdentity : Identity;
    const country = randomCountry();
    const gender = randomGender();
    const firstName = random_name({ first: true, gender });
    const lastName = random_name({ last: true });
    const DOB_date = randomBtwn(1, 28);
    const DOB_month = randomBtwn(0, 11);
    const DOB_year = randomBtwn(1985, 2000);
    const username = (firstName.substring(0, randomBtwn(2,3)) + lastName.substring(0, randomBtwn(1,2)) + randomNumber(randomBtwn(3,5)) + randomString(randomBtwn(2,5))).toLowerCase();
    const password = randomeSecurePassword( randomBtwn(10, 14) );
    const app_name = randomString(randomBtwn(6, 9)) + '-' + username;

    const _identity = {
        [_Identity.IDENTITY_COUNTRY]: country,
        [_Identity.IDENTITY_GENDER]: gender,
        [_Identity.IDENTITY_FIRST_NAME]: firstName,
        [_Identity.IDENTITY_LAST_NAME]: lastName,
        [_Identity.IDENTITY_DOB_DATE]: DOB_date,
        [_Identity.IDENTITY_DOB_MONTH]: DOB_month,
        [_Identity.IDENTITY_DOB_YEAR]: DOB_year,
        [_Identity.IDENTITY_USER_NAME]: username,
        [_Identity.IDENTITY_PASSWORD]: password,
        [_Identity.IDENTITY_APP_NAME]: app_name
    }

    return {
        ..._identity,
        ...defaults
    };
}

module.exports = {
    generateIdentity
}