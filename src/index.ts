import {resolve} from 'node:path';
import {Client} from './client.js';

const prefixUrl = 'http://simpledesktops.com';
// REVIEW: const dlDir = resolve('./images');
// const dlDir = resolve('/Users/jonno/Dropbox/desktop-backgrounds');
const dlDir = resolve('./images');

(async (client) => {
	try {
		const images$ = client.start('.desktops > .edge > .desktop > a');

		for await (const file of images$) {
			void file.download();
		}

		console.log('Completed');
	} catch (error: unknown) {
		console.log('app errors', error);
	}
})(new Client(prefixUrl, dlDir));
