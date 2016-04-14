import test from 'ava';
import {Client, FileDownload} from './client';

test('client constructor', async (t) => {
	const client = new Client('./fixtures/test', '');
});
