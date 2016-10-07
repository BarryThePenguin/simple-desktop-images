import {Client, FileDownload} from './client';
import {createWriteStream, open} from 'fs';
import {resolve} from 'path';

// const dlDir = resolve('./images');
const dlDir = resolve('/Users/jonathan.haines/Dropbox/desktop-backgrounds');
const client = new Client(dlDir, '.desktops > .edge > .desktop > a');

(async () => {
	try {
		const images$ = await client.start();
		images$.subscribe(file => download(file), (err: any) => console.log('err', err), () => console.log('Completed'));
	} catch (err) {
		console.log('app errors', err);
	}
})();

// save the image to the file system
async function download (file: Promise<FileDownload>) {
	const {url, path} = await file;
	open(path, 'rs', async (err) => {
		if (err) {
			const response = await client.download(url, {
				responseType: 'stream',
			});
			response.data.pipe(createWriteStream(path));
		} else {
			console.log('file exists', path);
		}
	});
}
