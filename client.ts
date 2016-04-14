import * as path from 'path';
import * as cheerio from 'cheerio';
import * as request from 'request-promise';
import {Observable, Subject} from 'rx';

export class FileDownload {
	public path
	constructor(public url : string, public imagePath : string, private dlDir : string) {
		this.path = this.imageName(imagePath);
	}
	// standardise image names
	private imageName(imagePath : string) {
		const savePath = imagePath
			.replace('/browse/desktops/', '')
			.split('/')
			.reduce((p, c, i) => this.renameFile(p, c, i))
			.trim();

		return path.join(this.dlDir, `${savePath}.png`);
	}
	// rename the image file
	private renameFile(previous : string, current : string, index : number) {
		const digit = current.length === 1 ? `0${current}` : current;
		const part = [current, `${previous}-${this.parseMonth(current)}`, `${previous}-${digit}`];
		const result = part[index] || `${previous} ${current.replace(' ', '-')}`;
		return decodeURIComponent(result);
	}
	private parseMonth(month : string) {
		const months = ['pad', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
		const result = months.indexOf(month).toString();
		return result.length === 1 ? `0${result}` : result;
	}
}

export class Client {
	private images$ : Subject<string>
	private httpClient
	constructor(private dlDir : string, private query : string) {
		const baseUrl = 'http://simpledesktops.com';

		// default httpClient
		this.httpClient = request.defaults({
			baseUrl,
			transform: body => cheerio.load(body)
		});
	}
	async start() {
		// Create Observer for images
		this.images$ = new Subject<string>();

		// get the home page
		const $ = await this.httpClient.get('/');

		// load the home page and find the first image
		const url = $(this.query).attr('href');
		return this.images$.startWith(url).map((url) => this.nextImage(url));
	}
	// load the image and write it to the stream
	private async nextImage(url : string) {
		const $ = await this.download(url);
		const next = $('a.back').attr('href');

		if (next) {
			this.images$.onNext(next);
		} else {
			this.images$.onCompleted();
		}

		return new FileDownload($('.desktop > a').attr('href'), url, this.dlDir);
	}
	download(uri : string) {
		return this.httpClient.get(uri);
	}
}
