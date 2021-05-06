import cheerio, {Cheerio, Node} from 'cheerio';
import {has} from 'dot-prop';
import {AfterResponseHook, Response} from 'got';

type ErrorExists = Error & {
	code?: string;
};

export function isUnknownObject(
	target: unknown
): target is Record<PropertyKey, unknown> {
	return target !== null && typeof target === 'object';
}

export const loadHtml: AfterResponseHook = (response: Response) => {
	const {headers, body} = response;
	const contentType = headers['content-type'] ?? '';

	if (typeof body === 'string' && contentType.includes('text/html')) {
		response.body = cheerio.load(body, {});
	}

	return response;
};

export function isFileExistsError(error: unknown): error is ErrorExists {
	return (
		isUnknownObject(error) && has(error, 'code') && error.code === 'EEXIST'
	);
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
