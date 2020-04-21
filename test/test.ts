import test from 'ava';
import {toArray} from 'rxjs/operators';
import nock from 'nock';
import {Client, FileDownload} from '../src/client';

const dlDir = './fixtures/test';

const prefixUrl = 'http://www.example.com';

test('no result', async (t) => {
	nock(prefixUrl)
		.defaultReplyHeaders({
			'Content-Type': 'text/html'
		})
		.get('/')
		.reply(
			200,
			`
		<a class="selector" />
	`
		);

	const client = new Client(prefixUrl, dlDir);

	const images$ = await client.start('.selector');

	return images$.pipe(toArray()).forEach((data) => {
		t.deepEqual(data, []);
	});
});

test('empty body', async (t) => {
	nock(prefixUrl)
		.defaultReplyHeaders({
			'Content-Type': 'text/html'
		})
		.get('/')
		.reply(200, '');

	const client = new Client(prefixUrl, dlDir);

	const images$ = await client.start('.selector');

	return images$.pipe(toArray()).forEach((data) => {
		t.deepEqual(data, []);
	});
});

test('incorrect content-type', async (t) => {
	nock(prefixUrl)
		.defaultReplyHeaders({
			'Content-Type': 'text/not-html'
		})
		.get('/')
		.reply(200);

	const client = new Client(prefixUrl, dlDir);

	const images$ = await client.start('.selector');

	return images$.pipe(toArray()).forEach((data) => {
		t.deepEqual(data, []);
	});
});

test('no content-type', async (t) => {
	nock(prefixUrl).get('/').reply(200);

	const client = new Client(prefixUrl, dlDir);

	const images$ = await client.start('.selector');

	return images$.pipe(toArray()).forEach((data) => {
		t.deepEqual(data, []);
	});
});

test('client constructor', async (t) => {
	nock(prefixUrl)
		.defaultReplyHeaders({
			'Content-Type': 'text/html'
		})
		.get('/')
		.reply(
			200,
			`
		<a class="selector" href="/browse/desktops/2017/jul/28/image-one" />
	`
		)
		.get('/browse/desktops/2017/jul/28/image-one')
		.reply(
			200,
			`
		<a class="back" href="/browse/desktops/2016/feb/02/image-two" />
		<div class="desktop">
			<a href="/download/?desktop=1234" />
		</div>
	`
		)
		.get('/browse/desktops/2016/feb/02/image-two')
		.reply(
			200,
			`
		<div class="desktop">
			<a href="/download/?desktop=5678" />
		</div>
	`
		);

	const client = new Client(prefixUrl, dlDir);

	const images$ = await client.start('.selector');

	return images$.pipe(toArray()).forEach((data) => {
		t.deepEqual(data, [
			new FileDownload(
				dlDir,
				'/browse/desktops/2017/jul/28/image-one',
				'/browse/desktops/2016/feb/02/image-two'
			),
			new FileDownload(
				dlDir,
				'/browse/desktops/2016/feb/02/image-two',
				'/download/?desktop=5678'
			)
		]);
	});
});
