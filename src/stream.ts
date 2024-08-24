import type { StreamPair, TimeToVersion, StreamKey } from "./types";
import { Stream } from "./types";
import { getBulkString, getBulkArray, getBulkArrayxRange } from "./helpers";

export const streamArray: Stream[] = [];
export let prevStreamID: string | null = null;
export const timeToVersion: TimeToVersion = {};
export const streamKey: StreamKey = {};

/**
 * Adds a new entry to a Redis stream.
 * @param commands The parsed commands from the client.
 * @returns A bulk string response with the stream ID or an error message.
 */
export function xAdd(commands: string[]): string {
	const cmdIndex = commands.indexOf("xadd");
	console.log("Commands", commands);
	let streamId = commands[cmdIndex + 2];

	if (streamId === "*") {
		streamId = `${Date.now().toString()}-0`;
	}
	const [milliseconds, version] = streamId.split("-");
	let newVersion = version;
	let auto = false;

	if (milliseconds === "0" && version === "0") {
		return "-ERR The ID specified in XADD must be greater than 0-0\r\n";
	}
	if (
		prevStreamID &&
		((milliseconds !== "*" && milliseconds < prevStreamID.split("-")[0]) ||
			(milliseconds === prevStreamID.split("-")[0] &&
				version !== "*" &&
				version <= prevStreamID.split("-")[1]))
	) {
		return "-ERR The ID specified in XADD is equal or smaller than the target stream top item\r\n";
	}
	if (version === "*") {
		auto = true;
		if (milliseconds in timeToVersion) {
			const versions = timeToVersion[milliseconds];
			// biome-ignore lint/style/useNumberNamespace: <explanation>
			const lastVersion = parseInt(versions[versions.length - 1], 10);
			newVersion = (lastVersion + 1).toString();
		} else {
			newVersion = milliseconds === "0" ? "1" : "0";
		}
	}

	if (!(milliseconds in timeToVersion)) {
		timeToVersion[milliseconds] = [];
	}
	timeToVersion[milliseconds].push(newVersion);

	const streamKeyEntry = commands[cmdIndex + 1];
	const stream = new Stream(streamKeyEntry, streamId);
	let keyCounter = cmdIndex + 2; // ID of stream

	while (keyCounter < commands.length - 1) {
		const keyVal: StreamPair[] = [];
		keyCounter += 1;
		keyVal.push({
			key: commands[keyCounter],
			value: commands[keyCounter + 1],
		});
		keyCounter += 1;
		stream.pairs.push(...keyVal);
	}

	if (!(streamKeyEntry in streamKey)) {
		streamKey[streamKeyEntry] = [];
	}
	streamKey[streamKeyEntry].push(stream);
	console.log("Stream Key", streamKey);
	streamArray.push(stream);
	console.log("Stream Array", streamArray);
	prevStreamID = streamId;

	if (auto) {
		const autoReply = `${milliseconds}-${newVersion}`;
		return getBulkString(autoReply);
	}
	return getBulkString(streamId);
}

/**
 * Retrieves the entries within a specified range in a Redis stream.
 * @param commands The parsed commands from the client.
 * @returns A bulk array response with the stream entries within the specified range.
 */
export function xRange(commands: string[]): string {
	const index = commands.indexOf("xrange");
	const leftBound = commands[index + 2].toString();
	const fromTheStart = leftBound === "-";
	const leftBoundTime = Number.parseInt(leftBound.split("-")[0], 10);
	const rightBound = commands[index + 3].toString();
	const rightBoundTime = Number.parseInt(rightBound.split("-")[0], 10);
	const containsVersionLeft = leftBound.includes("-");
	const containsVersionRight = rightBound.includes("-");

	const withinRange: Array<any[]> = []; // Change to an array of arrays
	let shouldInclude = false;

	for (const stream of streamArray) {
		const [timeStr, versionStr] = stream.id.split("-");
		const time = Number.parseInt(timeStr, 10);
		const version = Number.parseInt(versionStr, 10);

		if (fromTheStart) {
			shouldInclude = true;
		} else if (time === leftBoundTime) {
			if (containsVersionLeft) {
				const leftBoundVersion = Number.parseInt(leftBound.split("-")[1], 10);
				shouldInclude = version >= leftBoundVersion;
			} else {
				shouldInclude = true;
			}
		}

		if (time === rightBoundTime) {
			if (containsVersionRight) {
				const rightBoundVersion = Number.parseInt(rightBound.split("-")[1], 10);
				if (shouldInclude && version > rightBoundVersion) {
					shouldInclude = false;
				}
			} else {
				shouldInclude = true;
			}
		}

		if (time > leftBoundTime && time < rightBoundTime) {
			shouldInclude = true;
		} else if (time > rightBoundTime) {
			shouldInclude = false;
		}

		if (shouldInclude) {
			withinRange.push([
				stream.id,
				...stream.pairs.flatMap((pair: StreamPair) => [pair.key, pair.value]),
			]);
		}
	}

	return getBulkArray(withinRange);
}
