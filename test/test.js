import test from 'ava';
import axios from 'axios';
import moxios from 'moxios';
import {load} from 'cheerio';
import {Client, FileDownload} from '../src/client';

let httpClient;
const dlDir = './fixtures/test';

test.beforeEach(() => {
	httpClient = axios.create();
	moxios.install(httpClient);
});

test.afterEach(() => {
	moxios.uninstall(httpClient);
});

test('client constructor', async t => {
	moxios.stubRequest('/', {
		status: 200,
		responseText: load(`
			<a class="selector" href="/browse/desktops/2017/jul/28/image-one" />
		`)
	});

	moxios.stubRequest('/browse/desktops/2017/jul/28/image-one', {
		status: 200,
		responseText: load(`
			<a class="back" href="/browse/desktops/2016/feb/02/image-two" />
			<div class="desktop">
				<a href="/download/?desktop=1234" />
			</div>
		`)
	});

	moxios.stubRequest('/browse/desktops/2016/feb/02/image-two', {
		status: 200,
		responseText: load(`
			<div class="desktop">
				<a href="/download/?desktop=5678" />
			</div>
		`)
	});

	const client = new Client(httpClient, dlDir);

	const images$ = await client.start('.selector');

	return images$.toArray().forEach(data => {
		t.deepEqual(data, [
			new FileDownload(
				'/browse/desktops/2016/feb/02/image-two',
				'/browse/desktops/2017/jul/28/image-one',
				dlDir
			),
			new FileDownload(
				'/download/?desktop=5678',
				'/browse/desktops/2016/feb/02/image-two',
				dlDir
			)
		]);
	});
});
