import { resolve } from "node:path";
import test, { after } from "node:test";
import { deepEqual, ok } from "node:assert/strict";
import { equal } from "node:assert";
import * as undici from "undici";
import { Client } from "../src/client.ts";

const html = String.raw;

const dlDir = resolve("./fixtures/test");

const origin = "http://www.example.com";

const mockAgent = new undici.MockAgent();
mockAgent.disableNetConnect();
undici.setGlobalDispatcher(mockAgent);

after(() => {
	mockAgent.assertNoPendingInterceptors();
});

await test("no result", async () => {
	const agent = mockAgent.get(origin);

	agent
		.intercept({ path: "/" })
		.reply(200, html`<a class="selector">link text</a>`, {
			headers: { "Content-Type": "text/html" },
		});

	const client = new Client({ agent, dlDir, origin });

	const images$ = client.start(".selector");

	const result = await Array.fromAsync(images$);

	deepEqual(result, []);
});

await test("empty body", async () => {
	const agent = mockAgent.get(origin);

	agent.intercept({ path: "/" }).reply(200, {
		headers: { "Content-Type": "text/html" },
	});

	const client = new Client({ agent, dlDir, origin });

	const images$ = client.start(".selector");

	const result = await Array.fromAsync(images$);

	deepEqual(result, []);
});

await test("incorrect content-type", async () => {
	const agent = mockAgent.get(origin);

	agent.intercept({ path: "/" }).reply(200, {
		headers: { "Content-Type": "text/not-html" },
	});

	const client = new Client({ agent, dlDir, origin });

	const images$ = client.start(".selector");

	const result = await Array.fromAsync(images$);

	deepEqual(result, []);
});

await test("no content-type", async () => {
	const agent = mockAgent.get(origin);

	agent.intercept({ path: "/" }).reply(200);

	const client = new Client({ agent, dlDir, origin });

	const images$ = client.start(".selector");

	const result = await Array.fromAsync(images$);

	deepEqual(result, []);
});

await test("client constructor", async () => {
	const agent = mockAgent.get(origin);

	agent
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

	agent
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

	agent
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

	const client = new Client({ agent, dlDir, origin });

	const images$ = client.start(".selector");

	const [firstFile, secondFile] = await Array.fromAsync(images$);

	equal(firstFile?.dlDir, dlDir);
	equal(firstFile?.imagePath, "/browse/desktops/2017/jul/28/image-one");
	equal(firstFile?.path, resolve("./fixtures/test/2017-07-28 image-one.png"));

	equal(secondFile?.dlDir, dlDir);
	equal(secondFile?.imagePath, "/browse/desktops/2016/feb/02/image-two");
	equal(secondFile?.path, resolve("./fixtures/test/2016-02-02 image-two.png"));
});

await test("file exists", async () => {
	const agent = mockAgent.get(origin);

	agent
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

	agent
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

	agent
		.intercept({ path: "/download/?desktop=poop" })
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.reply(200);

	const client = new Client({ agent, dlDir, origin });

	const images$ = client.start(".selector");

	const [firstFile] = await Array.fromAsync(images$);

	ok(firstFile);

	await firstFile.download();
});

await test("directory does not exist", async () => {
	const agent = mockAgent.get(origin);

	agent
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

	agent
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

	agent
		.intercept({ path: "/download/?desktop=poop" })
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.reply(200);

	const client = new Client({
		agent,
		dlDir: resolve("./fixture/does/not/exist"),
		origin,
	});

	const images$ = client.start(".selector");

	const [firstFile] = await Array.fromAsync(images$);

	ok(firstFile);

	await firstFile.download();
});
