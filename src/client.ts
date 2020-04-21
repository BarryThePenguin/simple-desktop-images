import {join} from 'path';
import {load} from 'cheerio';
import got, {Got, CancelableRequest, Response, AfterResponseHook} from 'got';
import {Observable, Subject} from 'rxjs';
import {filter, startWith, mergeMap} from 'rxjs/operators';

const months = [
	'pad',
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec'
];

function parseMonth(month: string): string {
	const result = months.indexOf(month).toString();
	return result.padStart(2, '0');
}

// Rename the image file
function renameFile(previous: string, current: string, index: number): string {
	const digit = current.padStart(2, '0');
	const part = [
		current,
		`${previous}-${parseMonth(current)}`,
		`${previous}-${digit}`
	];
	const result = part[index] || `${previous} ${current.replace(' ', '-')}`;
	return decodeURIComponent(result);
}

// Standardise image names
function imageName(dlDir: string, imagePath: string): string {
	const savePath = imagePath
		.replace('/browse/desktops/', '')
		.split('/')
		.reduce(renameFile)
		.trim();

	return join(dlDir, `${savePath}.png`);
}

const loadHtml: AfterResponseHook = (response: Response) => {
	const {headers, body} = response;
	const contentType = headers['content-type'] ?? '';

	if (typeof body === 'string' && contentType.includes('text/html')) {
		response.body = load(body);
	}

	return response;
};

function isFileDownload(file: FileDownload | undefined): file is FileDownload {
	return file instanceof FileDownload;
}

export class FileDownload {
	dlDir: string;

	imagePath: string;

	path: string;

	url?: string;

	constructor(dlDir: string, imagePath: string, url?: string) {
		this.url = url;
		this.imagePath = imagePath;
		this.dlDir = dlDir;

		this.path = imageName(dlDir, imagePath);
	}
}

export class Client {
	httpClient: Got;

	images$: Subject<string>;

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
		this.images$ = new Subject();
	}

	async start(query: string): Promise<Observable<FileDownload>> {
		// Get the home page
		const response = await this.httpClient.get<CheerioStatic>('');
		const $ = response.body;
		// Load the home page and find the first image
		let url;

		if (typeof $ === 'function') {
			url = $(query).attr('href');
		}

		return this.images$.pipe(
			startWith(url),
			mergeMap(async (nextUrl) => this.nextImage(nextUrl), 4),
			filter(isFileDownload)
		);
	}

	download(url: string): CancelableRequest<Response<CheerioStatic>> {
		return this.httpClient.get<CheerioStatic>(url);
	}

	// Load the image and write it to the stream
	async nextImage(imageUrl?: string): Promise<FileDownload | undefined> {
		if (imageUrl) {
			const response = await this.download(imageUrl.replace(/^\/+/, ''));
			const $ = response.body;
			const next = $('a.back').attr('href');

			if (next) {
				this.images$.next(next);
			} else {
				this.images$.complete();
			}

			const url = $('.desktop > a').attr('href');

			return new FileDownload(this.dlDir, imageUrl, url);
		}

		this.images$.complete();
		return undefined;
	}
}
