import test from 'ava';
import {Client} from '../src/client';

test('client constructor', async t => {
	const client = new Client({}, './fixtures/test');

	const images$ = await client.start('.selector');

	t.truthy(images$);
});
