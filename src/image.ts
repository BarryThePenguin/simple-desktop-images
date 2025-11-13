import { join } from "node:path";
import { pipeline } from "node:stream";
import { createWriteStream } from "node:fs";
import type { ReadableStreamController } from "node:stream/web";

const imageExtensionRegex = /\.(gif|jpg|jpeg|png|webp)$/i;
const imagePathRegex = /(\d{4})\/(.+)\/(\d{2})\/([^/.]+)/i;
const whitespaceRegex = /\s+/g;

const months: Record<string, string> = {
	jan: "01",
	feb: "02",
	mar: "03",
	apr: "04",
	may: "05",
	jun: "06",
	jul: "07",
	aug: "08",
	sep: "09",
	oct: "10",
	nov: "11",
	dec: "12",
};

function parseImageName(imagePath: string) {
	const match = imagePathRegex.exec(imagePath) ?? [];
	const [, year, monthString, day, filename] = match;
	const month = monthString ? months[monthString] : undefined;
	let name;

	if (year && month && day && filename) {
		name = `${year}-${month}-${day.padStart(2, "0")} ${decodeURIComponent(
			filename,
		)
			.trim()
			.replaceAll(whitespaceRegex, "-")
			.replaceAll(/-+/g, "-")}`;
	}

	return name;
}

function filePath(dir: string, file: File): string {
	const extensionMatch = imageExtensionRegex.exec(file.name);
	const [, extension] = extensionMatch ?? [];
	return join(dir, `${file.name}.${extension ?? "png"}`);
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
	const name = parseImageName(url);
	if (name) {
		controller.enqueue({ downloadFile, name, url });
	} else {
		controller.error(new Error(`Could not parse image name from URL: ${url}`));
	}
}

/** Save the image to the file system */
export function download(dlDir: string): WritableStream<Image> {
	return new WritableStream({
		async write({ downloadFile, name }) {
			const file = await downloadFile(name);
			const path = filePath(dlDir, file);

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
