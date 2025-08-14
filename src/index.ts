import { resolve } from "node:path";
import * as undici from "undici";
import { Client } from "./client.ts";

const origin = "https://simpledesktops.com";
// REVIEW: const dlDir = resolve('./images');
// const dlDir = resolve('/Users/jonno/Dropbox/desktop-backgrounds');
const dlDir = resolve("./images");
const agent = new undici.Agent({ connections: 20 }).compose(
	undici.interceptors.redirect({ maxRedirections: 5 }),
);
const client = new Client({ agent, dlDir, origin });

try {
	const images$ = client.start(".desktops > .edge > .desktop > a");

	for await (const file of images$) {
		void file.download();
	}

	console.log("Completed");
} catch (error: unknown) {
	console.log("app errors", error);
}
