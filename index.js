import request from 'request-promise';
import cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import {Subject, Observable} from 'rx';

const dlDir = path.resolve('./images');
const baseUrl = 'http://simpledesktops.com';

// Create Observer for images
const images$ = new Subject();

// default httpClient
const httpClient = request.defaults({
	transform: body => cheerio.load(body),
	baseUrl
});

(async function() {
	try {
		// get the home page
		const $ = await httpClient.get('/');

		// load the home page and find the first image
		const url = $('.desktops > .edge > .desktop > a').attr('href');
		images$
			.startWith(url)
			.map(getImage)
			.subscribe(async f => download(await f), err => console.log('err', err), () => console.log('Completed'));
	} catch (err) {
		console.log('errors', err);
	}
})();

// load the image and write it to the stream
async function getImage(url) {
	const $ = await httpClient.get(url);
	const next = $('a.back').attr('href');

	next ? images$.onNext(next) : images$.onCompleted();

	return {
		url: $('.desktop > a').attr('href'),
		path: imageName(url)
	};
}

// standardise image names
function imageName(requestPath) {
	const savePath = requestPath
		.replace('/browse/desktops/', '')
		.split('/')
		.reduce(renameFile)
		.trim();

	return path.join(dlDir, `${savePath}.png`);
}

// rename the image file
function renameFile(previous, current, index) {
	const digit = current.length === 1 ? `0${current}` : current;
	const part = [current, `${previous}-${parseMonth(current)}`, `${previous}-${digit}`];
	const result = part[index] || `${previous} ${current.replace(' ', '-')}`;

	function parseMonth(month) {
		const months = ['pad', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
		const result = months.indexOf(month).toString();
		return result.length === 1 ? `0${result}` : result;
	}

	return decodeURIComponent(result);
}

// save the image to the file system
function download({url, path}) {
	fs.open(path, 'rs', err => {
		if (err) {
			httpClient.get(url).pipe(fs.createWriteStream(path));
		} else {
			console.log('file exists', path);
		}
	});
}
