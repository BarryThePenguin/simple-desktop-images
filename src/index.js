// @flow

import * as fs from 'fs';
import {promisify} from 'util';
import {resolve} from 'path';
import axios from 'axios';
import {load} from 'cheerio';
import {Client, FileDownload} from './client';

const open = promisify(fs.open);
const {createWriteStream} = fs;

const baseURL = 'http://simpledesktops.com';
// REVIEW: const dlDir = resolve('./images');
const dlDir = resolve('/Users/jhaines/Dropbox/desktop-backgrounds');

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

(async function(client) {
	try {
		const images$ = await client.start('.desktops > .edge > .desktop > a');

		images$.subscribe({
			next(file) {
				download(file);
			},
			error(err) {
				console.log('err', err);
			},
			complete() {
				console.log('Completed');
			}
		});
	} catch (err) {
		console.log('app errors', err);
	}

	// Save the image to the file system
	async function download(file: FileDownload) {
		const {url, path} = file;

		try {
			await open(path, 'wx', 666);

			const response = await client.download(url, {
				responseType: 'stream'
			});
			response.data.pipe(createWriteStream(path));
		} catch (err) {
			if (err.code === 'EEXIST') {
				console.log('file exists', path);
				return;
			}

			console.log('download error', err);
		}
	}
})(new Client(httpClient, dlDir));
