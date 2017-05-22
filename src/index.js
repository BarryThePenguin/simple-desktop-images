// @flow

import {createWriteStream, open} from 'fs';
import {resolve} from 'path';
import axios from 'axios';
import {load} from 'cheerio';
import {Client, FileDownload} from './client';

const baseURL = 'http://simpledesktops.com';
// Const dlDir = resolve('./images');
const dlDir = resolve('/Users/jonathan.haines/Dropbox/desktop-backgrounds');
const httpClient = axios.create({
	baseURL,
	transformResponse: [
		(data, headers) => {
			const contentType = headers ? headers['content-type'] : '';

			if (contentType.includes('text/html')) {
				return load(data);
			}

			return data;
		}
	]
});

const client = new Client(httpClient, dlDir);

client.start('.desktops > .edge > .desktop > a').then(images$ => {
	images$.subscribe(file => download(file), (err: any) => console.log('err', err), () => console.log('Completed'));
}).catch(err => {
	console.log('app errors', err);
});

// Save the image to the file system
function download(file: FileDownload) {
	try {
		const {url, path} = file;

		open(path, 'wx', 666, err => {
			if (err) {
				if (err.code === 'EEXIST') {
					console.log('file exists', path);
					return;
				}

				throw err;
			}

			client.download(url, {
				responseType: 'stream'
			}).then(response => response.data.pipe(createWriteStream(path)));
		});
	} catch (err) {
		console.log('download error', err);
	}
}
