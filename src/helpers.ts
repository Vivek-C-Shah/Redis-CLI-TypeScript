import type { BulkArray, RedisResponse } from "./types";

/**
 * Converts a string into a Redis bulk string format.
 * @param str The string to convert.
 * @returns The bulk string formatted for Redis.
 */
export function getBulkString(str: string | null): string {
	if (str === null) {
		return "$-1\r\n";
	}
	return `$${str.length}\r\n${str}\r\n`;
}

/**
 * Converts an array into a Redis bulk array format.
 * @param array The array to convert.
 * @returns The bulk array formatted for Redis.
 */

export function getBulkArray(array: Array<any>): string {
	if (!array || array.length === 0) {
		return "*0\r\n";
	}

	let bulkResponse = `*${array.length}\r\n`;

	for (const element of array) {
		if (Array.isArray(element)) {
			bulkResponse += getBulkArray(element);
		} else if (typeof element === "string") {
			bulkResponse += getBulkString(element);
		} else if (typeof element === "object" && element !== null) {
			bulkResponse += `*${element.length}\r\n`;
			for (const item of element) {
				if (typeof item === "string") {
					bulkResponse += getBulkString(item);
				} else if (Array.isArray(item)) {
					bulkResponse += getBulkArray(item);
				}
			}
		}
	}

	return bulkResponse;
}

/**
 * Reads data from a buffer and returns it as a string.
 * @param data The buffer to read from.
 * @returns A promise that resolves to a string.
 */
export async function readData(data: Buffer): Promise<string> {
	return data.toString();
}

/**
 * Parses a Redis response from a master and updates the replica dictionary.
 * @param data The raw data from the master.
 * @param replicaDict The dictionary to update with the parsed data.
 */
export function parseRedisResponseFromMaster(
	data: string,
	replicaDict: { [key: string]: string },
): void {
	console.log("Data received from Master:", data);
	const type = data.charAt(0);

	switch (type) {
		case "+":
			// Simple string response (e.g., +OK)
			break;
		case "*": {
			// Array
			const delimiter = data.indexOf("\r\n");
			const bulkStrings = data.slice(delimiter + 2);
			const stringArray = bulkStrings.split("\r\n");
			for (let i = 0; i < stringArray.length; i++) {
				if (stringArray[i] === "SET") {
					replicaDict[stringArray[i + 2]] = stringArray[i + 4];
					if (i + 6 < stringArray.length && stringArray[i + 6] === "px") {
						setTimeout(
							() => {
								delete replicaDict[stringArray[i + 2]];
							},
							Number.parseInt(stringArray[i + 8]),
						);
					}
				}
			}
			break;
		}
		// Additional cases for other response types can be added here
	}
}

/**
 * Awaits changes in a stream key array, used for blocking commands.
 * @param keys The stream keys to monitor.
 * @param streamKey The stream data structure to monitor.
 * @returns A promise that resolves when a change is detected.
 */
export async function awaitChange(
	keys: string[],
	streamKey: any,
): Promise<void> {
	return new Promise((resolve) => {
		const blockedStreamCopy = streamKey[keys[0]].slice();
		console.log("Copy", blockedStreamCopy);
		const intervalId = setInterval(() => {
			if (blockedStreamCopy.length < streamKey[keys[0]].length) {
				clearInterval(intervalId);
				resolve();
			}
		}, 1000);
	});
}

/**
 * Converts a raw Redis response string into a structured RedisResponse object.
 * @param data The raw response data from Redis.
 * @returns The structured RedisResponse object.
 */
export function parseRedisResponse(data: string): RedisResponse {
	const type = data.charAt(0);
	let response: RedisResponse = { type: "", data: "" };

	switch (type) {
		case "+": // Simple String
			response = { type: "simple", data: data.slice(1) };
			break;
		case "-": // Error
			response = { type: "error", data: data.slice(1) };
			break;
		case ":": // Integer
			response = { type: "integer", data: data.slice(1) };
			break;
		case "$": {
			// Bulk String
			const length = Number.parseInt(data.slice(1, data.indexOf("\r\n")), 10);
			if (length === -1) {
				response = { type: "bulk", data: null };
			} else {
				response = {
					type: "bulk",
					data: data.slice(
						data.indexOf("\r\n") + 2,
						data.indexOf("\r\n") + 2 + length,
					),
				};
			}
			break;
		}
		case "*": {
			// Array
			const count = Number.parseInt(data.slice(1, data.indexOf("\r\n")), 10);
			const elements: RedisResponse[] = [];
			let remainingData = data.slice(data.indexOf("\r\n") + 2);
			for (let i = 0; i < count; i++) {
				const element = parseRedisResponse(remainingData);
				elements.push(element);
				remainingData = remainingData.slice(
					remainingData.indexOf("\r\n") + 2 + (element.data as string).length,
				);
			}
			response = { type: "array", data: elements };
			break;
		}
		default:
			response = { type: "unknown", data };
			break;
	}

	return response;
}

export function getBulkArrayxRange(array: Array<any>): string {
	if (!array || array.length === 0) {
		return "*0\r\n";
	}

	let bulkResponse = `*${array.length}\r\n`;

	for (const element of array) {
		if (Array.isArray(element)) {
			// Handle each sub-array (which could be a nested structure)
			bulkResponse += getBulkArray(element);
		} else if (typeof element === "string") {
			// Handle individual strings
			bulkResponse += getBulkString(element);
		} else if (typeof element === "object" && element !== null) {
			// Handle nested structures that are objects
			const items = element.items || [];
			bulkResponse += `*${items.length}\r\n`;
			bulkResponse += getBulkArray(items);
		}
	}

	return bulkResponse;
}