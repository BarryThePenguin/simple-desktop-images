import * as cheerio from "cheerio";
import type * as undici from "undici";
import { FileDownload } from "./file-download.ts";

type ClientOptions = {
	agent: undici.Dispatcher;
	origin: string;
};

export class Client {
	http: undici.Dispatcher;

	origin: string;

	constructor({ agent, origin }: ClientOptions) {
		this.http = agent;
		this.origin = origin;
	}

	start(query: string): ReadableStream<FileDownload> {
		let url: string | undefined;
		const { origin } = this;

		return new ReadableStream({
			start: async () => {
				// Get the home page
				const $ = await this.loadContent("/");
				// Load the home page and find the first image
				url = $(query).attr("href");
			},
			pull: async (controller) => {
				if (url) {
					const { path, next } = await this.nextImage(url);

					if (path) {
						const file = new FileDownload(url, async () => {
							const response = await this.http.request({
								method: "GET",
								origin,
								path,
							});

							return response.body;
						});
						controller.enqueue(file);
					}

					url = next;
				} else {
					controller.close();
				}
			},
		});
	}

	download(dlDir: string): WritableStream<FileDownload> {
		return new WritableStream({
			async write(chunk) {
				await chunk.download(dlDir);
			},
		});
	}

	private async loadContent(path: string) {
		const response = await this.http.request({
			method: "GET",
			path,
			origin: this.origin,
		});
		const content = await response.body.text();
		return cheerio.load(content);
	}

	/**
	 * Load the image and write it to the stream
	 */
	private async nextImage(
		imageUrl: string,
	): Promise<{ next: string | undefined; path: string | undefined }> {
		const $ = await this.loadContent(imageUrl);

		const next = $("a.back").attr("href");
		const path = $(".desktop > a").attr("href");

		return { next, path };
	}
}
