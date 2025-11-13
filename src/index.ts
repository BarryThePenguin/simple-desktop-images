import { resolve } from "node:path";
import * as undici from "undici";
import * as client from "./client.ts";

// REVIEW: const dlDir = resolve('./images');
// const dlDir = resolve('/Users/jonno/Dropbox/desktop-backgrounds');
const dlDir = resolve("./images");
const agent = new undici.Agent({ connections: 20 });
const redirect = undici.interceptors.redirect({ maxRedirections: 5 });
const dispatcher = agent.compose(redirect);

const images$ = client.images(".desktops > .edge > .desktop > a", {
	dispatcher,
	origin: "https://simpledesktops.com",
});

try {
	await images$.pipeTo(client.download(dlDir));
	console.log("Completed");
} catch (error: unknown) {
	console.log("app errors", error);
}
