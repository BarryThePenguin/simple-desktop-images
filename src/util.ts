import {load, type Cheerio} from 'cheerio';
import type {AnyNode} from 'domhandler';
import type {AfterResponseHook, Response} from 'got';

export const loadHtml: AfterResponseHook = (response: Response) => {
	const {headers, body} = response;
	const contentType = headers['content-type'] ?? '';

	if (typeof body === 'string' && contentType.includes('text/html')) {
		response.body = load(body, {});
	}

	return response;
};

export function isFileExistsError(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}

export function getHref<T extends AnyNode>(
	doc: Cheerio<T>,
): string | undefined {
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
