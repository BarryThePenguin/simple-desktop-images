import { resolve } from "node:path";
import test, { after } from "node:test";
import { deepEqual, rejects } from "node:assert/strict";
import { equal } from "node:assert";
import * as undici from "undici";
import * as client from "../src/client.ts";

const html = String.raw;

const dlDir = resolve("./fixtures/test");

const origin = "http://www.example.com";

const mockAgent = new undici.MockAgent();
mockAgent.disableNetConnect();
undici.setGlobalDispatcher(mockAgent);

after(() => {
	mockAgent.assertNoPendingInterceptors();
});

void test("no result", async () => {
	const dispatcher = mockAgent.get(origin);

	dispatcher
		.intercept({ path: "/" })
		.reply(200, html`<a class="selector">link text</a>`, {
			headers: { "Content-Type": "text/html" },
		});

	const images$ = client.images(".selector", { dispatcher, origin });

	const result = await Array.fromAsync(images$);

	deepEqual(result, []);
});

void test("empty body", async () => {
	const dispatcher = mockAgent.get(origin);

	dispatcher.intercept({ path: "/" }).reply(200, {
		headers: { "Content-Type": "text/html" },
	});

	const images$ = client.images(".selector", { dispatcher, origin });

	const result = await Array.fromAsync(images$);

	deepEqual(result, []);
});

void test("incorrect content-type", async () => {
	const dispatcher = mockAgent.get(origin);

	dispatcher.intercept({ path: "/" }).reply(200, {
		headers: { "Content-Type": "text/not-html" },
	});

	const images$ = client.images(".selector", { dispatcher, origin });

	const result = await Array.fromAsync(images$);

	deepEqual(result, []);
});

void test("no content-type", async () => {
	const dispatcher = mockAgent.get(origin);

	dispatcher.intercept({ path: "/" }).reply(200);

	const images$ = client.images(".selector", { dispatcher, origin });

	const result = await Array.fromAsync(images$);

	deepEqual(result, []);
});

void test("client constructor", async () => {
	const dispatcher = mockAgent.get(origin);

	dispatcher
		.intercept({ path: "/" })
		.defaultReplyHeaders({ "Content-Type": "text/html" })
		.reply(
			200,
			html`
				<a class="selector" href="/browse/desktops/2017/jul/28/image-one">
					link text
				</a>
			`,
		);

	dispatcher
		.intercept({
			path: "/browse/desktops/2017/jul/28/image-one",
		})
		.defaultReplyHeaders({ "Content-Type": "text/html" })
		.reply(
			200,
			html`
				<a class="back" href="/browse/desktops/2016/feb/02/image-two">
					link text
				</a>
				<div class="desktop">
					<a href="/download/?desktop=1234">link text</a>
				</div>
			`,
		);

	dispatcher
		.intercept({
			path: "/browse/desktops/2016/feb/02/image-two",
		})
		.defaultReplyHeaders({ "Content-Type": "text/html" })
		.reply(
			200,
			html`
				<div class="desktop">
					<a href="/download/?desktop=5678">link text</a>
				</div>
			`,
		);

	const images$ = client.images(".selector", { dispatcher, origin });

	const [firstFile, secondFile] = await Array.fromAsync(images$);

	equal(firstFile?.url, "/browse/desktops/2017/jul/28/image-one");
	equal(firstFile?.name, "2017-07-28 image-one");

	equal(secondFile?.url, "/browse/desktops/2016/feb/02/image-two");
	equal(secondFile?.name, "2016-02-02 image-two");
});

void test("file exists", async () => {
	const dispatcher = mockAgent.get(origin);

	dispatcher
		.intercept({ path: "/" })
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.reply(
			200,
			html`
				<a class="selector" href="/browse/desktops/2020/oct/24/poop">
					link text
				</a>
			`,
		);

	dispatcher
		.intercept({ path: "/browse/desktops/2020/oct/24/poop" })
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.reply(
			200,
			html`
				<div class="desktop">
					<a href="/download/?desktop=poop">link text</a>
				</div>
			`,
		);

	dispatcher
		.intercept({ path: "/download/?desktop=poop" })
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.reply(200);

	const images$ = client.images(".selector", { dispatcher, origin });

	await images$.pipeTo(client.download(dlDir));
});

void test("directory does not exist", async () => {
	const dispatcher = mockAgent.get(origin);

	dispatcher
		.intercept({ path: "/" })
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.reply(
			200,
			html`
				<a class="selector" href="/browse/desktops/2020/oct/24/poop">
					link text
				</a>
			`,
		);

	dispatcher
		.intercept({ path: "/browse/desktops/2020/oct/24/poop" })
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.reply(
			200,
			html`
				<div class="desktop">
					<a href="/download/?desktop=poop">link text</a>
				</div>
			`,
		);

	dispatcher
		.intercept({ path: "/download/?desktop=poop" })
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.reply(200);

	const images$ = client.images(".selector", { dispatcher, origin });

	await images$.pipeTo(client.download(resolve("./fixture/does/not/exist")));
});

void test("invalid image URL", async () => {
	const dispatcher = mockAgent.get(origin);

	dispatcher
		.intercept({ path: "/" })
		.defaultReplyHeaders({ "Content-Type": "text/html" })
		.reply(
			200,
			html`
				<a class="selector" href="/browse/desktops/123/lol/28/image-one">
					link text
				</a>
			`,
		);

	dispatcher
		.intercept({
			path: "/browse/desktops/123/lol/28/image-one",
		})
		.defaultReplyHeaders({ "Content-Type": "text/html" })
		.reply(
			200,
			html`
				<a class="back" href="/browse/desktops/2016/feb/02/image-two">
					link text
				</a>
				<div class="desktop">
					<a href="/download/?desktop=1234">link text</a>
				</div>
			`,
		);

	const images$ = client.images(".selector", { dispatcher, origin });

	await rejects(async () => Array.fromAsync(images$), {
		message:
			"Could not parse image name from URL: /browse/desktops/123/lol/28/image-one",
	});
});
