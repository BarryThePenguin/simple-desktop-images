// @flow

import {join} from 'path';
import type {Axios, AxiosPromise, AxiosXHRConfigBase} from 'axios';
import {Observable, Observer} from 'rxjs';
import {startWith, mergeMap} from 'rxjs/operators';

function parseMonth(month: string) {
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
	const result = months.indexOf(month).toString();
	return result.length === 1 ? `0${result}` : result;
}

// Rename the image file
function renameFile(previous: string, current: string, index: number) {
	const digit = current.length === 1 ? `0${current}` : current;
	const part = [
		current,
		`${previous}-${parseMonth(current)}`,
		`${previous}-${digit}`
	];
	const result = part[index] || `${previous} ${current.replace(' ', '-')}`;
	return decodeURIComponent(result);
}

// Standardise image names
function imageName(dlDir: string, imagePath: string) {
	const savePath = imagePath
		.replace('/browse/desktops/', '')
		.split('/')
		.reduce((p, c, i) => renameFile(p, c, i))
		.trim();

	return join(dlDir, `${savePath}.png`);
}

export class FileDownload {
	dlDir: string;

	imagePath: string;

	path: string;

	url: string;

	constructor(url: string, imagePath: string, dlDir: string) {
		this.url = url;
		this.imagePath = imagePath;
		this.dlDir = dlDir;

		this.path = imageName(dlDir, imagePath);
	}
}

export class Client {
	httpClient: Axios;

	images$: Observer<string>;

	dlDir: string;

	constructor(httpClient: Axios, dlDir: string) {
		// Default httpClient
		this.httpClient = httpClient;
		this.dlDir = dlDir;
	}

	async start(query: string): Promise<Observable<FileDownload>> {
		// Get the home page
		const response = await this.httpClient.get('/');
		const $ = response.data;
		// Load the home page and find the first image
		const url = $(query).attr('href');

		return Observable.create(observer => {
			this.images$ = observer;
		}).pipe(
			startWith(url),
			mergeMap(nextUrl => this.nextImage(nextUrl), 4)
		);
	}

	download(uri: string, options?: AxiosXHRConfigBase<*>): AxiosPromise<*> {
		return this.httpClient.get(uri, options);
	}

	// Load the image and write it to the stream
	async nextImage(imageUrl: string) {
		const response = await this.download(imageUrl);
		const $ = response.data;
		const next = $('a.back').attr('href');

		if (next) {
			this.images$.next(next);
		} else {
			this.images$.complete();
		}

		return new FileDownload(
			$('.desktop > a').attr('href'),
			imageUrl,
			this.dlDir
		);
	}
}
