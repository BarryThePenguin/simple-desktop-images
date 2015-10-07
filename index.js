import request from 'request';
import cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import _ from 'highland';

const dlDir = path.resolve('./images');
const baseUrl = 'http://simpledesktops.com';

// Create stream for images
const imageStream = _();

// default httpClient
const httpClient = request.defaults({
	baseUrl
});

// stream the default httpClient
const get = _.wrapCallback(httpClient.get);

// get the home page
get('/').errors(errorHandler).each(hostLoad);

// download each image in the stream
imageStream.errors(errorHandler).each(downloadImage);

// close the stream on error
function errorHandler(err, push) {
	push(null, {});
	_.log('errors', err);
}

// load the home page and find the first image
function hostLoad(response) {
	const $ = cheerio.load(response.body);
	const entry = $('.desktops > .edge > .desktop > a').attr('href');
	get(entry).each(getEntry);
}

// load the image and write it to the stream
function getEntry(response) {
	const $ = cheerio.load(response.body);
	const back = $('a.back').attr('href');

	imageStream.write({
		imageUrl: $('.desktop > a').attr('href'),
		savePath: imageName(response.request.uri.path)
	});

	if (back) {
		get(back).each(getEntry);
	} else {
		imageStream.end();
	}
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
function renameFile(previousValue, currentValue, index) {
	let result;
	let digit;

	switch (index) {
		case 0:
			result = currentValue;
			break;
		case 1:
			result = `${previousValue}-${parseMonth(currentValue)}`;
			break;
		case 2:
			digit = currentValue.length === 1 ? `0${currentValue}` : currentValue;
			result = `${previousValue}-${digit}`;
			break;
		default:
			result = `${previousValue} ${currentValue.replace(' ', '-')}`;
			break;
	}

	function parseMonth(month) {
		const months = ['pad', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
		const result = months.indexOf(month).toString();
		return result.length === 1 ? `0${result}` : result;
	}

	return decodeURIComponent(result);
}

// download the image to the file system
function downloadImage(result) {
	const saveImage = _.curry((result, err) => {
		if (err) {
			httpClient.get(result.imageUrl).pipe(fs.createWriteStream(result.savePath));
		} else {
			_.log('file exists', result.savePath);
		}
	});

	fs.open(result.savePath, 'rs', saveImage(result));
}
