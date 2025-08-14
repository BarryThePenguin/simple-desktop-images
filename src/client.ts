import * as cheerio from "cheerio";
import type * as undici from "undici";
import { FileDownload } from "./file-download.ts";

type ClientOptions = {
	agent: undici.Dispatcher;
	dlDir: string;
	origin: string;
};

export class Client {
	http: undici.Dispatcher;

	dlDir: string;

	origin: string;

	constructor({ agent, dlDir, origin }: ClientOptions) {
		this.dlDir = dlDir;
		this.http = agent;
		this.origin = origin;
	}

	async *start(query: string): AsyncIterable<FileDownload> {
		// Get the home page
		const $ = await this.fromPath("/");
		// Load the home page and find the first image
		let url = $(query).attr("href");

		while (typeof url === "string") {
			// eslint-disable-next-line no-await-in-loop
			const { file, next } = await this.nextImage(url);
			url = next;

			yield file;
		}
	}

	private async fromPath(path: string) {
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
	): Promise<{ next: string | undefined; file: FileDownload }> {
		const { dlDir, http, origin } = this;
		const $ = await this.fromPath(imageUrl);

		const next = $("a.back").attr("href");
		const path = $(".desktop > a").attr("href") ?? "";

		return {
			next,
			file: new FileDownload(dlDir, imageUrl, async () => {
				const response = await http.request({ method: "GET", path, origin });
				return response.body;
			}),
		};
	}
}
