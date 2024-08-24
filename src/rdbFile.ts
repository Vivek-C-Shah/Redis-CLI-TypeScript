import fs from "node:fs";
import path from "node:path";
import type { Dictionary } from "./types";
import { CURRENT_YEAR, FC, FB, FD } from "./config";

let isRead = false;
const listOfRBKeys: string[] = [];
const dictionary: Dictionary = {};

export function readRDBFile(dir: string, dbfile: string): void {
	if (!dir || !dbfile || isRead) {
		return;
	}

	isRead = true;
	const rdbPath = path.join(dir, dbfile);
	const rdbFileBuffer = fs.readFileSync(rdbPath);

	let keyBufferArray: number[] = []; // stores each Buffer/character of key string
	let valueBufferArray: number[] = []; // stores each Buffer/character of value string
	let key = "";
	let val = "";
	let hasExpiry = false;
	let year = CURRENT_YEAR;
	let isFC = false;

	for (let i = 0; i < rdbFileBuffer.length; i++) {
		if (rdbFileBuffer[i] === FB) {
			// ASCII for FB: hashtable size information
			const start = i;
			let noOfPairs = Number.parseInt(rdbFileBuffer[start + 1].toString(10), 10);
			console.log("noOfPairs", noOfPairs);
			const noOfHashes = Number.parseInt(rdbFileBuffer[start + 2].toString(10), 10);
			console.log("noOfHashes", noOfHashes);
			let currentBuffer = start + 3; // moving on to the Expiry and Key-Value Section

			while (noOfPairs > 0) {
				hasExpiry = false;
				isFC = false;
				console.log("First Buffer", rdbFileBuffer[currentBuffer]);

				if (
					rdbFileBuffer[currentBuffer] === FC ||
					rdbFileBuffer[currentBuffer] === FD
				) {
					// ASCII for FC and FD
					hasExpiry = true;
					const expiryBuffer: string[] = [];
					if (rdbFileBuffer[currentBuffer] === FC) {
						// FC
						isFC = true;
						for (let j = currentBuffer + 1; j < currentBuffer + 9; j++) {
							console.log("Orig Buffer", rdbFileBuffer[j]);
							let hexBuffer = rdbFileBuffer[j].toString(16);
							const hexBufferLength = hexBuffer.length;
							if (hexBufferLength < 2) {
								hexBuffer = `0${hexBuffer}`; // pad with 0 for single digit numbers for accurate epoch conversion
							}
							expiryBuffer.push(hexBuffer);
						}
						currentBuffer += 9; // move to the Key-Value Section
					} else {
						// FD
						for (let j = currentBuffer + 1; j < currentBuffer + 5; j++) {
							console.log("Orig Buffer", rdbFileBuffer[j]);
							console.log("Hex Buffer", rdbFileBuffer[j].toString(16));
							expiryBuffer.push(rdbFileBuffer[j].toString(16));
						}
						currentBuffer += 6; // moving to the Key-Value Section
					}
					const exp = expiryBuffer.reverse().join("");
					console.log("Joined Expiry", exp);
					const expiry = Number.parseInt(exp, 16);
					console.log("Expiry", expiry);
					const date = new Date(expiry);
					const readableDate = date.toLocaleString();
					console.log("readableDate", readableDate);
					year = Number.parseInt(readableDate.split(",")[0].split("/")[2], 10); // extracting the year
				}

				currentBuffer += 1; // skipping the String Encoded Value 00

				const keyLength = Number.parseInt(
					rdbFileBuffer[currentBuffer].toString(10),
					10,
				); // length of key string
				for (
					let j = currentBuffer + 1;
					j < currentBuffer + keyLength + 1;
					j++
				) {
					keyBufferArray.push(rdbFileBuffer[j]); // push each Key character Buffer to keyBufferArray
				}
				currentBuffer += keyLength + 1;

				const valueLength = Number.parseInt(
					rdbFileBuffer[currentBuffer].toString(10),
					10,
				);
				const valStart = currentBuffer + 1;

				for (let j = valStart; j < valStart + valueLength; j++) {
					valueBufferArray.push(rdbFileBuffer[j]);
				}
				currentBuffer += valueLength + 1;

				key = Buffer.from(keyBufferArray).toString("ascii"); // from Character Buffers to String
				listOfRBKeys.push(key); // push key to list of all RB file keys
				keyBufferArray = []; // reset the key Buffer Array for the next key
				val = Buffer.from(valueBufferArray).toString("ascii"); // from Character Buffers to String
				valueBufferArray = []; // reset the value Buffer Array for the next value
				dictionary[key] = val;

				console.log("Key\n", key);
				console.log("Value\n", val);

				if (hasExpiry) {
					if (isFC && year < CURRENT_YEAR) {
						console.log("Key to be deleted", key);
						delete dictionary[key];
					}
				}

				noOfPairs -= 1;
			}
			break; // Exit the loop after processing the pairs
		}
	}
}

export function getListOfRBKeys(): string[] {
	return listOfRBKeys;
}

export function getDictionary(): Dictionary {
	return dictionary;
}
