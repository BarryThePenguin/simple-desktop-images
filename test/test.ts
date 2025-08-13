import { resolve } from "node:path";
import test from "ava";
import nock from "nock";
import { Client } from "../src/client.ts";
import { toArray } from "../src/util.ts";

const dlDir = resolve("./fixtures/test");

const prefixUrl = "http://www.example.com";

test("no result", async (t) => {
	const scope = nock(prefixUrl)
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.get("/")
		.reply(
			200,
			`
		<a class="selector">
		  linkt text
		</a>
	`,
		);

	const client = new Client(prefixUrl, dlDir);

	const images$ = client.start(".selector");

	const result = await toArray(images$);

	t.deepEqual(result, []);
	t.true(scope.isDone());
});

test("empty body", async (t) => {
	const scope = nock(prefixUrl)
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.get("/")
		.reply(200, "");

	const client = new Client(prefixUrl, dlDir);

	const images$ = client.start(".selector");

	const result = await toArray(images$);

	t.deepEqual(result, []);
	t.true(scope.isDone());
});

test("incorrect content-type", async (t) => {
	const scope = nock(prefixUrl)
		.defaultReplyHeaders({
			"Content-Type": "text/not-html",
		})
		.get("/")
		.reply(200);

	const client = new Client(prefixUrl, dlDir);

	const images$ = client.start(".selector");

	const result = await toArray(images$);

	t.deepEqual(result, []);
	t.true(scope.isDone());
});

test("no content-type", async (t) => {
	const scope = nock(prefixUrl).get("/").reply(200);

	const client = new Client(prefixUrl, dlDir);

	const images$ = client.start(".selector");

	const result = await toArray(images$);

	t.deepEqual(result, []);
	t.true(scope.isDone());
});

test("client constructor", async (t) => {
	const scope = nock(prefixUrl)
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.get("/")
		.reply(
			200,
			`
		<a class="selector" href="/browse/desktops/2017/jul/28/image-one">
			linkt text
		</a>
	`,
		)
		.get("/browse/desktops/2017/jul/28/image-one")
		.reply(
			200,
			`
		<a class="back" href="/browse/desktops/2016/feb/02/image-two">
		  link text
		</a>
		<div class="desktop">
			<a href="/download/?desktop=1234">
			  link text
			</a>
		</div>
	`,
		)
		.get("/browse/desktops/2016/feb/02/image-two")
		.reply(
			200,
			`
		<div class="desktop">
			<a href="/download/?desktop=5678">
			  link text
			</a>
		</div>
	`,
		);

	const client = new Client(prefixUrl, dlDir);

	const images$ = client.start(".selector");

	const [firstFile, secondFile] = await toArray(images$);

	t.like(firstFile, {
		dlDir,
		imagePath: "browse/desktops/2017/jul/28/image-one",
		path: resolve("./fixtures/test/2017-07-28 image-one.png"),
	});

	t.like(secondFile, {
		dlDir,
		imagePath: "browse/desktops/2016/feb/02/image-two",
		path: resolve("./fixtures/test/2016-02-02 image-two.png"),
	});

	t.true(scope.isDone());
});

test("file exists", async (t) => {
	const scope = nock(prefixUrl)
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.get("/")
		.reply(
			200,
			`
		<a class="selector" href="/browse/desktops/2020/oct/24/poop">
			linkt text
		</a>
	`,
		)
		.get("/browse/desktops/2020/oct/24/poop")
		.reply(
			200,
			`
		<div class="desktop">
			<a href="/download/?desktop=poop">
			  link text
			</a>
		</div>
	`,
		)
		.get("/download/?desktop=poop")
		.reply(200, "");

	const client = new Client(prefixUrl, dlDir);

	const images$ = client.start(".selector");

	const [firstFile] = await toArray(images$);

	await firstFile?.download();

	t.true(scope.isDone());
});

test("directory does not exist", async (t) => {
	const scope = nock(prefixUrl)
		.defaultReplyHeaders({
			"Content-Type": "text/html",
		})
		.get("/")
		.reply(
			200,
			`
		<a class="selector" href="/browse/desktops/2020/oct/24/poop">
			linkt text
		</a>
	`,
		)
		.get("/browse/desktops/2020/oct/24/poop")
		.reply(
			200,
			`
		<div class="desktop">
			<a href="/download/?desktop=poop">
			  link text
			</a>
		</div>
	`,
		)
		.get("/download/?desktop=poop")
		.reply(200);

	const client = new Client(prefixUrl, resolve("./fixture/does/not/exist"));

	const images$ = client.start(".selector");

	const [firstFile] = await toArray(images$);

	await firstFile?.download();

	t.true(scope.isDone());
});
