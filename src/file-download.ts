import { join } from "node:path";
import { type Readable, pipeline } from "node:stream";
import { createWriteStream } from "node:fs";

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

export class FileDownload {
	readonly #imagePath: string;

	readonly #downloadFile: () => Promise<Readable>;

	get name() {
		return imageName(this.#imagePath);
	}

	get imagePath() {
		return this.#imagePath;
	}

	constructor(imagePath: string, downloadFile: () => Promise<Readable>) {
		this.#imagePath = imagePath;
		this.#downloadFile = downloadFile;
	}

	// Save the image to the file system
	async download(dlDir: string) {
		const path = join(dlDir, this.name);

		pipeline(
			await this.#downloadFile(),
			createWriteStream(path, {
				flags: "wx",
				mode: 0o644,
				encoding: "utf8",
			}),
			(error) => {
				if (error?.code === "EEXIST") {
					console.log("file already exists", path);
				} else if (error) {
					console.error("download error", error);
				}
			},
		);
	}
}
