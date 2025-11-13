import { join } from "node:path";
import { pipeline } from "node:stream";
import { createWriteStream } from "node:fs";
import type { ReadableStreamController } from "node:stream/web";

const months = [
	"pad",
	"jan",
	"feb",
	"mar",
	"apr",
	"may",
	"jun",
	"jul",
	"aug",
	"sep",
	"oct",
	"nov",
	"dec",
];

function parseMonth(month: string): string {
	const result = months.indexOf(month).toString();
	return result.padStart(2, "0");
}

/** Rename the image file */
function renameFile(
	year: string,
	month: string,
	day: string,
	rest: string,
): string {
	const result = `${year}-${parseMonth(month)}-${day.padStart(2, "0")} ${rest}`;
	return decodeURIComponent(result).trim();
}

/** Standardise image names */
function imageName(imagePath: string): string {
	const [year, month, day, ...rest] = imagePath
		.replace("/browse/desktops/", "")
		.split("/");

	const savePath = renameFile(
		year ?? "",
		month ?? "",
		day ?? "",
		rest.join(" ").trim().replace(" ", "-"),
	);
	return `${savePath}.png`;
}

type Chunk = {
	downloadFile: (name: string) => Promise<File>;
	url: string;
};

export type Image = Chunk & {
	name: string;
};

export function enqueue(
	controller: ReadableStreamController<Image>,
	{ downloadFile, url }: Chunk,
): void {
	const name = imageName(url);
	controller.enqueue({ downloadFile, name, url });
}

/** Save the image to the file system */
export function download(filePath: string): WritableStream<Image> {
	return new WritableStream({
		async write({ downloadFile, name }) {
			const path = join(filePath, name);
			const file = await downloadFile(name);

			pipeline(
				file.stream(),
				createWriteStream(path, { flags: "wx", mode: 0o644 }),
				(error) => {
					if (error?.code === "EEXIST") {
						console.warn("file already exists", path);
					} else if (error) {
						console.error("download error", error);
					}
				},
			);
		},
	});
}
