import cheerio, {Cheerio, Node} from 'cheerio';
import type {AfterResponseHook, Response} from 'got';

export const loadHtml: AfterResponseHook = (response: Response) => {
	const {headers, body} = response;
	const contentType = headers['content-type'] ?? '';

	if (typeof body === 'string' && contentType.includes('text/html')) {
		response.body = cheerio.load(body, {});
	}

	return response;
};

export function isFileExistsError(error: NodeJS.ErrnoException): boolean {
	return error.code === 'EEXIST';
}

export function getHref<T extends Node>(doc: Cheerio<T>): string | undefined {
	const url = doc.attr('href');
	return url?.replace(/^\/+/, '');
}

export async function toArray<T>(iterator: AsyncIterable<T>): Promise<T[]> {
	const array = [];

	for await (const entry of iterator) {
		array.push(entry);
	}

	return array;
}
