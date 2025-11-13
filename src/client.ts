import * as cheerio from "cheerio";
import type * as undici from "undici";
import { type Image, enqueue } from "./image.ts";

export { download } from "./image.ts";

export type ImageOptions = {
	dispatcher: undici.Dispatcher;
	origin: string;
};

export function images(query: string, { dispatcher, origin }: ImageOptions) {
	let url: string | undefined;

	return new ReadableStream<Image>({
		async start() {
			// Get the home page
			const $ = await load("/");
			// Load the home page and find the first image
			url = $(query).attr("href");
		},
		async pull(controller) {
			if (url) {
				const $ = await load(url);

				const next = $("a.back").attr("href");
				const path = $(".desktop > a").attr("href");

				if (path) {
					const downloadFile = download(path);
					enqueue(controller, { downloadFile, url });
				}

				url = next;
			} else {
				controller.close();
			}
		},
	});

	function download(path: string) {
		return async (name: string) => {
			const response = await request(path);
			const blob = await response.body.blob();
			return new File([blob], name, { type: blob.type });
		};
	}

	async function load(path: string) {
		const response = await request(path);
		const content = await response.body.text();
		return cheerio.load(content);
	}

	async function request(path: string) {
		return dispatcher.request({ path, method: "GET", origin });
	}
}
