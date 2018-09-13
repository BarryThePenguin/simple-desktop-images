// @flow

import {promises as fs} from 'fs';
import {resolve} from 'path';
import axios from 'axios';
import {load} from 'cheerio';
import {Client, FileDownload} from './client';

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
	} catch (error) {
		console.log('app errors', error);
	}

	// Save the image to the file system
	async function download(file: FileDownload) {
		const {url, path} = file;
		let handler;

		try {
			handler = await fs.open(path, 'wx', 0o644);

			const response = await client.download(url, {
				responseType: 'arraybuffer'
			});

			await handler.writeFile(response.data, {encoding: 'utf-8'});
		} catch (error) {
			if (error.code === 'EEXIST') {
				console.log('file exists', path);
				return;
			}

			console.log('download error', error);
		} finally {
			if (handler) {
				await handler.close();
			}
		}
	}
})(new Client(httpClient, dlDir));
