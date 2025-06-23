import {join} from 'node:path';
import type {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createWriteStream} from 'node:fs';
import {isFileExistsError} from './util.ts';

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
	'dec',
];

export function parseMonth(month: string): string {
	const result = months.indexOf(month).toString();
	return result.padStart(2, '0');
}

// Rename the image file
function renameFile(
	year: string,
	month: string,
	day: string,
	rest: string,
): string {
	const result = `${year}-${parseMonth(month)}-${day.padStart(2, '0')} ${rest}`;
	return decodeURIComponent(result).trim();
}

// Standardise image names
export function imageName(dlDir: string, imagePath: string): string {
	const [year, month, day, ...rest] = imagePath
		.replace('browse/desktops/', '')
		.split('/');

	const savePath = renameFile(
		year ?? '',
		month ?? '',
		day ?? '',
		rest.join(' ').trim().replace(' ', '-'),
	);
	return join(dlDir, `${savePath}.png`);
}

export class FileDownload {
	readonly #dlDir: string;

	readonly #imagePath: string;

	readonly #downloadFile: () => Readable;

	readonly #path: string;

	get dlDir(): string {
		return this.#dlDir;
	}

	get imagePath(): string {
		return this.#imagePath;
	}

	get path(): string {
		return this.#path;
	}

	constructor(dlDir: string, imagePath: string, downloadFile: () => Readable) {
		this.#dlDir = dlDir;
		this.#imagePath = imagePath;
		this.#downloadFile = downloadFile;

		this.#path = imageName(dlDir, imagePath);
	}

	// Save the image to the file system
	async download() {
		try {
			await pipeline(
				this.#downloadFile(),
				createWriteStream(this.#path, {
					flags: 'wx',
					mode: 0o644,
					encoding: 'utf8',
				}),
			);
		} catch (error: unknown) {
			if (isFileExistsError(error)) {
				console.log('file already exists', this.#path);
			} else {
				console.log('download error', error);
			}
		}
	}
}
