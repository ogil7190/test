const axios = require('axios');
const https = require('https');
const _options = {
	SPEECH_TO_TEXT_URL: 'https://api.wit.ai/speech?v=20170307',
	AUTHORIZATION: 'Bearer BNRYP2JH6LWQCQEKYYC77EN2ETOSX4HP'
};

function rdn(min, max) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min)) + min
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function getResult(page) {
	return await page.evaluate(() => document.getElementById('g-recaptcha-response').value);
}

async function isSolved(page) {
	const _content = await getResult(page);
	if (_content.length > 0) {
		console.log('--> Captcha Success');
		return true;
	}
	return false;
}

async function checkIfPageHaveCaptcha( page ){
	const iframe = await page.evaluate( ()=> {
		return document.querySelector('iframe[src*="api2/anchor"]');
	});
	if( iframe ) return true;
	return false;
}

async function clickCheckBox(page) {
	console.log('--> Clicking Check Box');
	await page.waitForFunction(() => {
		const iframe = document.querySelector('iframe[src*="api2/anchor"]')
		if (!iframe) return false
		return !!iframe.contentWindow.document.querySelector('#recaptcha-anchor')
	});
	let frames = await page.frames()
	const recaptchaFrame = frames.find(frame => frame.url().includes('api2/anchor'))
	const checkbox = await recaptchaFrame.$('#recaptcha-anchor')
	await checkbox.click({
		delay: rdn(30, 150)
	});
	if (await isSolved(page)) {
		return await getResult(page);
	}
	await sleep(500);
	return await clickAudioButton(page);
}

async function clickAudioButton(page) {
	console.log('--> Clicking Audio Button');
	await page.waitForFunction(() => {
		const iframe = document.querySelector('iframe[src*="api2/bframe"]')
		if (!iframe) return false

		const img = iframe.contentWindow.document.querySelector('.rc-image-tile-wrapper img')
		return img && img.complete
	})
	frames = await page.frames()
	const imageFrame = frames.find(frame => frame.url().includes('api2/bframe'))
	const audioButton = await imageFrame.$('#recaptcha-audio-button')
	await audioButton.click({
		delay: rdn(500, 1500)
	});
	await sleep(500);
	return await getAudioBytes(page);
}

async function getAudioBytes(page) {
	console.log('--> Getting Audio Bytes');
	await page.waitForFunction(() => {
		const iframe = document.querySelector('iframe[src*="api2/bframe"]')
		if (!iframe) return false
		return !!iframe.contentWindow.document.querySelector('.rc-audiochallenge-tdownload-link')
	})
	const audioLink = await page.evaluate(() => {
		const iframe = document.querySelector('iframe[src*="api2/bframe"]')
		return iframe.contentWindow.document.querySelector('.rc-audiochallenge-tdownload-link').href
	});
	const audioBytes = await page.evaluate(audioLink => {
		return (async () => {
			const response = await window.fetch(audioLink)
			const buffer = await response.arrayBuffer()
			return Array.from(new Uint8Array(buffer))
		})()
	}, audioLink);
	await sleep(500);
	return await audioToText(page, audioBytes);
}

async function audioToText(page, audioBytes) {
	console.log('--> Converting Audio to Text');
	const httsAgent = new https.Agent({
		rejectUnauthorized: false
	})
	const response = await axios({
		httsAgent,
		method: 'post',
		url: _options.SPEECH_TO_TEXT_URL,
		data: new Uint8Array(audioBytes).buffer,
		headers: {
			Authorization: _options.AUTHORIZATION,
			'Content-Type': 'audio/mpeg3'
		}
	});
	const audioTranscript = response.data._text.trim();
	await sleep(500);
	return inputSolvedAudio(page, audioTranscript);
}

async function inputSolvedAudio(page, audioTranscript) {
	console.log('--> Inputing Converted Text');
	const frames = await page.frames()
	const imageFrame = frames.find(frame => frame.url().includes('api2/bframe'))
	const input = await imageFrame.$('#audio-response')
	input.value = "";
	await input.click({
		delay: rdn(30, 150)
	});
	await input.type(audioTranscript, {
		delay: rdn(120, 200)
	});

	const verifyButton = await imageFrame.$('#recaptcha-verify-button')
	await verifyButton.click({
		delay: rdn(50, 150)
	});
	await sleep(500);
	return await checkIfSolved(page);
}

async function checkIfSolved(page) {
	console.log('--> Checking if Solved');
	await page.waitForFunction(() => {
		const iframe = document.querySelector('iframe[src*="api2/anchor"]')
		const iframe2 = document.querySelector('iframe[src*="api2/bframe"]')
		if (!iframe || !iframe2) return false;
		return !!iframe.contentWindow.document.querySelector('#recaptcha-anchor[aria-checked="true"]') || !!iframe2.contentWindow.document.querySelector('.rc-audiochallenge-error-message');
	});

	if (await isSolved(page)) {
		return await getResult(page);
	} else {
		await sleep(500);

		const haveError = await page.evaluate(() => {
			const iframe = document.querySelector('iframe[src*="api2/bframe"]')
			return !!iframe.contentWindow.document.querySelector('.rc-audiochallenge-error-message');
		});

		if (haveError) {
			console.log('--> Found resolve error');
			console.log('--> Re solving');
			return await getAudioBytes(page);
		} else {
			console.log('--> Something went wrong :(');
		}
	}
}

async function injectGoogleCookies(browser) {
	console.log('--> Injecting Google Cookies');
	const topics = ['national', 'state', 'our', 'country', 'good', 'bad', 'spritual', 'hot'];
	const page = await browser.newPage();
	await page.goto('https://google.com');
	await page.mouse.move(rdn(0, 500), rdn(500, 0));
	
	await page.click('[name=q]');
	await page.mouse.move(rdn(0, 500), rdn(500, 0));
	const index = Math.floor(Math.random() * topics.length);
	await page.keyboard.type( topics[ index ] + " news", {
		delay: rdn(100, 150)
	});

	await page.keyboard.press('Enter');
	await page.mouse.move(rdn(0, 500), rdn(500, 0));
	
	await page.waitForSelector('h3.LC20lb', {
		timeout: 15000
	});
	await page.evaluate(() => {
		let elements = document.querySelectorAll('h3.LC20lb')
		let randomIndex = Math.floor(Math.random() * elements.length);
		elements[randomIndex].click();
	});
	
	await page.mouse.move(rdn(0, 500), rdn(500, 0));
	await sleep(rdn(1000, 2000));
	await page.goBack();
	await page.mouse.move(rdn(0, 500), rdn(500, 0));
	await page.mouse.move(rdn(0, 500), rdn(500, 0));
	await sleep(rdn(1000, 2000));
	await page.mouse.move(rdn(0, 500), rdn(500, 0));
	await sleep(rdn(1000, 2000));
	await page.close();
}

async function solveCaptcha(page, browser, options={}) {
	Object.assign(_options, options);
	await injectGoogleCookies(browser);
	return await clickCheckBox(page);
}

module.exports = {
	solveCaptcha,
	checkIfPageHaveCaptcha
}