import {join} from 'path';
import {pipeline, Readable} from 'stream';
import {promisify} from 'util';
import {createWriteStream} from 'fs';
import {isFileExistsError} from './util';

const pipe = promisify(pipeline);

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
		year,
		month,
		day,
		rest.join(' ').trim().replace(' ', '-'),
	);
	return join(dlDir, `${savePath}.png`);
}

export class FileDownload {
	dlDir: string;

	imagePath: string;

	path: string;

	downloadFile: () => Readable;

	constructor(dlDir: string, imagePath: string, downloadFile: () => Readable) {
		this.dlDir = dlDir;
		this.imagePath = imagePath;
		this.downloadFile = downloadFile;

		this.path = imageName(dlDir, imagePath);
	}

	// Save the image to the file system
	async download() {
		const {downloadFile, path} = this;

		return pipe(
			downloadFile(),
			createWriteStream(path, {flags: 'wx', mode: 0o644, encoding: 'utf-8'}),
		).catch((error) => {
			if (isFileExistsError(error)) {
				console.log('file already exists', path);
			} else {
				console.log('download error', error);
			}
		});
	}
}
