import * as fs from 'fs';
import * as path from 'path';

import {Client, FileDownload} from './client';

const dlDir = path.resolve('./images');
// const dlDir : string = path.resolve('C:/Users/Jonathan/Dropbox/desktop-backgrounds');
const client = new Client(dlDir, '.desktops > .edge > .desktop > a');

(async function() {
	try {
			const images$ = await client.start();
			images$.subscribe(file => download(file), err => console.log('err', err), () => console.log('Completed'));
	} catch (err) {
		console.log('app errors', err);
	}
})();

// save the image to the file system
async function download (file : Promise<FileDownload>) {
	const {url, path} = await file;
	fs.open(path, 'rs', err => {
		if (err) {
			client.download(url).pipe(fs.createWriteStream(path));
		} else {
			console.log('file exists', path);
		}
	});
}
