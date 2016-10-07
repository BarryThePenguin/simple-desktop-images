import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import {Static, load} from 'cheerio';
import {join} from 'path';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/startWith';
import {Subject} from 'rxjs/Subject';

export class FileDownload {
	public path: string;
	constructor(public url: string, public imagePath: string, private dlDir: string) {
		this.path = this.imageName(imagePath);
	}
	// standardise image names
	private imageName(imagePath: string) {
		const savePath = imagePath
			.replace('/browse/desktops/', '')
			.split('/')
			.reduce((p, c, i) => this.renameFile(p, c, i))
			.trim();

		return join(this.dlDir, `${savePath}.png`);
	}
	// rename the image file
	private renameFile(previous: string, current: string, index: number) {
		const digit = current.length === 1 ? `0${current}` : current;
		const part = [current, `${previous}-${this.parseMonth(current)}`, `${previous}-${digit}`];
		const result = part[index] || `${previous} ${current.replace(' ', '-')}`;
		return decodeURIComponent(result);
	}
	private parseMonth(month: string) {
		const months = ['pad', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
		const result = months.indexOf(month).toString();
		return result.length === 1 ? `0${result}` : result;
	}
}

export class Client {
	private images$: Subject<string>;
	private httpClient: AxiosInstance;
	constructor(private dlDir: string, private query: string) {
		const baseURL = 'http://simpledesktops.com';

		// default httpClient
		this.httpClient = axios.create({
			baseURL,
			transformResponse: (data, headers) => {
				const contentType = headers['content-type'];

				if (contentType.includes('text/html')) {
					return load(data);
				}

				return data;
			},
		});
	}
	public async start() {
		// Create Observer for images
		this.images$ = new Subject<string>();

		// get the home page
		const response = await this.httpClient.get('/');

		const $ = response.data as Static;

		// load the home page and find the first image
		const url = $(this.query).attr('href');

		return this.images$.startWith(url).map((nextUrl) => this.nextImage(nextUrl));
	}
	public download(uri: string, options?: AxiosRequestConfig) {
		return this.httpClient.get(uri, options);
	}
	// load the image and write it to the stream
	private async nextImage(url: string) {
		const response = await this.download(url);
		const $ = response.data as Static;
		const next = $('a.back').attr('href');

		if (next) {
			this.images$.next(next);
		} else {
			this.images$.complete();
		}

		return new FileDownload($('.desktop > a').attr('href'), url, this.dlDir);
	}
}
