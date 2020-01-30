import {promises as fs} from 'fs';
import {resolve} from 'path';
import {Client, FileDownload} from './client';

const prefixUrl = 'http://simpledesktops.com';
// REVIEW: const dlDir = resolve('./images');
const dlDir = resolve('/Users/jonno/Dropbox/desktop-backgrounds');

(async client => {
	try {
		const images$ = await client.start('.desktops > .edge > .desktop > a');

		images$.subscribe({
			next: download,
			error(err: Error) {
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
	async function download(file?: FileDownload): Promise<void> {
		if (file) {
			const {url, path} = file;
			let handler;

			try {
				handler = await fs.open(path, 'wx', 0o644);

				const response = await client.download(url, {
					responseType: 'buffer'
				});

				await handler.writeFile(response.body, {encoding: 'utf-8'});
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
	}
})(new Client(prefixUrl, dlDir));