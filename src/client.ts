import got, {Got, CancelableRequest, Response} from 'got';
import {getHref, loadHtml} from './util';
import {FileDownload} from './file-download';
import type {CheerioAPI} from 'cheerio';

export class Client {
	httpClient: Got;

	dlDir: string;

	constructor(prefixUrl: string, dlDir: string) {
		// Default httpClient
		this.httpClient = got.extend({
			prefixUrl,
			hooks: {
				afterResponse: [loadHtml]
			}
		});
		this.dlDir = dlDir;
	}

	async *start(query: string) {
		// Get the home page
		const response = await this.httpClient.get<CheerioAPI>('');
		const $ = response.body;
		// Load the home page and find the first image
		let url: string | undefined;

		if (typeof $ === 'function') {
			url = getHref($(query));
		}

		while (true) {
			if (!url) break;

			// eslint-disable-next-line no-await-in-loop
			const {file, next} = await this.nextImage(url);
			url = next;

			yield file;
		}
	}

	download(url: string): CancelableRequest<Response<CheerioAPI>> {
		return this.httpClient.get<CheerioAPI>(url);
	}

	// Load the image and write it to the stream
	private async nextImage(
		imageUrl: string
	): Promise<{next?: string; file: FileDownload}> {
		const response = await this.download(imageUrl);
		const $ = response.body;

		const next = getHref($('a.back'));
		const url = getHref($('.desktop > a'));

		return {
			next,
			file: new FileDownload(this.dlDir, imageUrl, () =>
				this.httpClient.stream.get({url})
			)
		};
	}
}
