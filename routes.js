const express = require('express')

let global;
const router = express.Router();

function setGlobal(_global) {
	console.log('Set Global');
	global = _global;
}

router.get('/test', (req, res) => {
	res.json({
		'success': true
	});
});

module.exports = {
	router,
	setGlobal
}