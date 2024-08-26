import type { Connection, Dictionary, ReplicaDict, ExecQueue } from "./types";
import {
	getBulkString,
	getBulkArray,
	parseRedisResponseFromMaster,
	awaitChange,
} from "./helpers";
import { readRDBFile } from "./rdbFile";
import { streamArray, streamKey, xAdd, xRange } from "./stream";
import { config } from "./config";
import { exec } from "node:child_process";
import { handleSubscribe, handleUnsubscribe, handlePublish } from "./handlePubSub";
import * as listOperations from "./listOperations";

const dictionary: Dictionary = {};
const replicaDict: ReplicaDict = {};
let isMultiCalled = false;
let execQueue: ExecQueue = [];

export async function handleCommand(
	command: string,
	connection: Connection,
): Promise<string | null> {
	const sudoCommands = command.split("\r\n").filter(Boolean);
	const commands = sudoCommands
		.slice(1)
		.filter((_, i) => i % 2 === 1)
		.map((cmd) => cmd.toLowerCase());

	console.log("Commands in handle command", sudoCommands);

	if (commands.includes("discard")) {
		return handleDiscard();
	}
	if (commands.includes("exec")) {
		return handleExec();
	}
	if (commands.includes("multi")) {
		isMultiCalled = true;
		return handleMulti();
	}
	if (commands.includes("incr")) {
		return handleIncr(commands);
	}
	if (commands.includes("xread")) {
		return await handleXRead(commands);
	}
	if (commands.includes("xrange")) {
		return handleXRange(commands);
	}
	if (commands.includes("xadd")) {
		return handleXAdd(commands);
	}
	if (commands.includes("type")) {
		return handleType(commands);
	}
	if (commands.includes("keys")) {
		return handleKeys();
	}
	if (commands.includes("config")) {
		return handleConfig(commands);
	}
	if (commands.includes("info")) {
		return handleInfo();
	}
	if (commands.includes("replconf")) {
		return "+OK\r\n";
	}
	if (commands.includes("echo")) {
		return handleEcho(commands);
	}
	if (commands.includes("ping")) {
		return "+PONG\r\n";
	}
	if (commands.includes("set")) {
		return handleSet(commands);
	}
	if (commands.includes("get")) {
		return handleGet(commands);
	}
	if (commands.includes("wait")) {
		handleWait(commands, connection);
		return null; // No immediate response
	}
	if (commands.includes("psync")) {
		return handlePSync(connection);
	}
	if (commands.includes("subscribe")) {
		return handleSubscribe(commands, connection);
	}
	if (commands.includes("unsubscribe")) {
		return handleUnsubscribe(commands);
	}
	if (commands.includes("publish")) {
		return handlePublish(commands);
	}
	if (commands.includes("lpush")) {
		const key = commands[commands.indexOf("lpush") + 1];
		const value = commands.slice(commands.indexOf("lpush") + 2);
		return `:${listOperations.lpush(key, value)}\r\n`;
	}
	if (commands.includes("rpush")) {
		const key = commands[commands.indexOf("rpush") + 1];
		const values = commands.slice(commands.indexOf("rpush") + 2);
		return `:${listOperations.rpush(key, values)}\r\n`;
	}
	if (commands.includes("lpop")) {
		const key = commands[commands.indexOf("lpop") + 1];
		const value = listOperations.lpop(key);
		return value ? `$${value.length}\r\n${value}\r\n` : "$-1\r\n";
	}
	if (commands.includes("rpop")) {
		const key = commands[commands.indexOf("rpop") + 1];
		const value = listOperations.rpop(key);
		return value ? `$${value.length}\r\n${value}\r\n` : "$-1\r\n";
	}
	if (commands.includes("llen")) {
		const key = commands[commands.indexOf("llen") + 1];
		return `:${listOperations.llen(key)}\r\n`;
	}
	if (commands.includes("lrange")) {
		const key = commands[commands.indexOf("lrange") + 1];
		const start = Number.parseInt(commands[commands.indexOf("lrange") + 2]);
		const stop = Number.parseInt(commands[commands.indexOf("lrange") + 3]);
		const range = listOperations.lrange(key, start, stop);
		return getBulkArray(range);
	}
	if (commands.includes("ltrim")) {
		const key = commands[commands.indexOf("ltrim") + 1];
		const start = Number.parseInt(commands[commands.indexOf("ltrim") + 2]);
		const stop = Number.parseInt(commands[commands.indexOf("ltrim") + 3]);
		return listOperations.ltrim(key, start, stop);
	}
	if (commands.includes("lmove")) {
		const source = commands[commands.indexOf("lmove") + 1];
		const destination = commands[commands.indexOf("lmove") + 2];
		const whereFrom = commands[commands.indexOf("lmove") + 3];
		const whereTo = commands[commands.indexOf("lmove") + 4];
		const value = listOperations.lmove(source, destination, whereFrom, whereTo);
		return value ? `$${value.length}\r\n${value}\r\n` : "$-1\r\n";
	}
	if (commands.includes("lindex")) {
		const key = commands[commands.indexOf("lindex") + 1];
		const index = Number.parseInt(commands[commands.indexOf("lindex") + 2]);
		const value = listOperations.lindex(key, index);
		return value ? `$${value.length}\r\n${value}\r\n` : "$-1\r\n";
	}
	if (commands.includes("lset")) {
		const key = commands[commands.indexOf("lset") + 1];
		const index = Number.parseInt(commands[commands.indexOf("lset") + 2]);
		const value = commands[commands.indexOf("lset") + 3];
		return `:${listOperations.lset(key, index, value)}\r\n`;
	}
	if (commands.includes("lrem")) {
		const key = commands[commands.indexOf("lrem") + 1];
		const count = Number.parseInt(commands[commands.indexOf("lrem") + 2]);
		const value = commands[commands.indexOf("lrem") + 3];
		return `:${listOperations.lrem(key, count, value)}\r\n`;
	}
	if (commands.includes("linsert")) {
		const key = commands[commands.indexOf("linsert") + 1];
		const where = commands[commands.indexOf("linsert") + 2];
		const pivot = commands[commands.indexOf("linsert") + 3];
		const value = commands[commands.indexOf("linsert") + 4];
		return `:${listOperations.linsert(key, where, pivot, value)}\r\n`;
	}
	if (commands.includes("lgetall")) {
		const key = commands[commands.indexOf("lgetall") + 1];
		return getBulkArray(listOperations.lgetall(key));
	}

	return null;
}

function handleDiscard(): string {
	if (!isMultiCalled) {
		return "-ERR DISCARD without MULTI\r\n";
	}
	execQueue = [];
	isMultiCalled = false;
	return "+OK\r\n";
}

function handleExec(): string {
	const response = execFunction(isMultiCalled, execQueue);
	isMultiCalled = false;
	execQueue.length = 0;
	return response;
}

function handleMulti(): string {
	isMultiCalled = true;
	execQueue = [];
	return "+OK\r\n";
}

function handleIncr(commands: string[]): string {
	if (isMultiCalled) {
		execQueue.push(commands);
		return "+QUEUED\r\n";
		// biome-ignore lint/style/noUselessElse: <explanation>
	} else {
		return incrFunction(commands);
	}
}

async function handleXRead(commands: string[]): Promise<string> {
	const queries = commands.slice(commands.indexOf("streams") + 1);
	console.log("Queries ::", queries);
	const idStart = queries.length / 2;
	const collectKeys: string[] = [];
	const collectIDs: string[] = [];

	for (let i = 0; i < idStart; i += 2) {
		collectKeys.push(queries[i]);
	}
	for (let j = idStart; j < queries.length; j += 2) {
		if (queries[j] === "$") {
			const lastID =
				streamKey[collectKeys[collectKeys.length - 1]][
					streamKey[collectKeys.length - 1].length - 1
				].id;
			queries[j] = lastID ? lastID : "0-0";
		}
		collectIDs.push(queries[j]);
	}

	if (commands.includes("block")) {
		const timeIndex = Number.parseInt(
			commands[commands.indexOf("block") + 2],
			10,
		);
		if (timeIndex === 0) {
			await awaitChange(collectKeys, streamKey);
		}
		const res = await xreadStreams(collectKeys, collectIDs, timeIndex);
		return getBulkArray(res);
	}
	const res = await xreadStreams(collectKeys, collectIDs);
	console.log("Res", res);
	return getBulkArray(res);
}

function handleXRange(commands: string[]): string {
	return xRange(commands);
}

function handleXAdd(commands: string[]): string {
	return xAdd(commands);
}

function handleType(commands: string[]): string {
	const typeIndex = commands.indexOf("type");
	const key = commands[typeIndex + 1];
	if (!(key in dictionary) && !(key in streamKey)) {
		return "+none\r\n";
	}
	if (key in streamKey) {
		return "+stream\r\n";
	}
	const typeValue = typeof dictionary[key];
	return `+${typeValue}\r\n`;
}

function handleKeys(): string {
	try {
		if (config.dir && config.dbfilename) {
			readRDBFile(config.dir, config.dbfilename);
		}
		return getBulkArray(Object.keys(dictionary));
	} catch (error: unknown) {
		console.error((error as Error).message);
		return "$-1\r\n";
	}
}

function handleConfig(commands: string[]): string {
	const responses: string[] = [];

	if (commands.includes("dir")) {
		responses.push(
			`*2\r\n${getBulkString("dir")}${getBulkString(config.dir || "")}`,
		);
	}
	if (commands.includes("dbfilename")) {
		responses.push(
			`*2\r\n${getBulkString("dbfilename")}${getBulkString(config.dbfilename || "")}`,
		);
	}

	return responses.join("");
}

function handleInfo(): string {
	if (config.isSlave) {
		return getBulkString("role:slave");
	}
	return getBulkString(
		"role:master\nmaster_replid:8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb\nmaster_repl_offset:0",
	);
}

function handleEcho(commands: string[]): string {
	const echoIndex = commands.indexOf("echo");
	return getBulkString(commands[echoIndex + 1]);
}

function handleSet(commands: string[]): string {
	if (isMultiCalled) {
		execQueue.push(commands);
		return "+QUEUED\r\n";
	}
	propagateToReplicas(commands.join("\r\n"));
	return setCommand(commands);
}

function handleGet(commands: string[]): string {
	if (isMultiCalled) {
		execQueue.push(commands);
		return "+QUEUED\r\n";
	}
	return getCommand(commands);
}

function handleWait(commands: string[], connection: Connection): void {
	const index = commands.indexOf("wait");
	const noOfReps = Number.parseInt(commands[index + 1]);
	const time = Number.parseInt(commands[index + 2]);
	waitCommand(noOfReps, time, connection);
}

function handlePSync(connection: Connection): string {
	connection.type = "replica";
	return "+FULLRESYNC 8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb 0\r\n";
}

/**
 * Handles executing queued commands in a MULTI/EXEC transaction.
 * @param isMultiCalled Boolean indicating if MULTI has been called.
 * @param execQueue The queue of commands to execute.
 * @returns The result of the transaction.
 */

function execFunction(isMultiCalled: boolean, execQueue: string[][]): string {
	if (!isMultiCalled || !execQueue) {
		return "-ERR EXEC without MULTI\r\n";
	}

	let cmd = `*${execQueue.length}\r\n`; // Start with array count in RESP format

	for (const command of execQueue) {
		const instruction = command[0]; // Command is at the first position
		let res = "";

		if (instruction === "incr") {
			res = incrFunction(command);
		} else if (instruction === "set") {
			res = setCommand(command);
		} else if (instruction === "get") {
			res = getCommand(command);
		} else {
			res = "-ERR unknown command\r\n";
		}

		// Append the result of each command to the overall response
		cmd += res;
	}

	return cmd;
}

function incrFunction(commands: string[]): string {
	const key = commands[commands.indexOf("incr") + 1];
	if (!(key in dictionary)) {
		dictionary[key] = "0";
	}
	let val = Number.parseInt(dictionary[key], 10);
	if (Number.isNaN(val)) {
		return "-ERR value is not an integer or out of range\r\n";
	}
	val += 1;
	dictionary[key] = val.toString();
	return `:${val}\r\n`;
}

function setCommand(commands: string[]): string {
	const setIndex = commands.indexOf("set");
	const key = commands[setIndex + 1];
	const value = commands[setIndex + 2];

	// Store the key-value pair in the dictionary
	dictionary[key] = value;

	// Check if there is a 'px' option to set an expiration time
	if (commands.includes("px")) {
		const pxIndex = commands.indexOf("px");
		const ttl = Number.parseInt(commands[pxIndex + 1]);

		// Set a timeout to delete the key after the TTL expires
		setTimeout(() => {
			delete dictionary[key];
		}, ttl);
	}
	console.log("Dictionary", dictionary);
	return "+OK\r\n"; // Return success response
}

function getCommand(commands: string[]): string {
	const index = commands.indexOf("get");
	if (config.dir && config.dbfilename) {
		readRDBFile(config.dir, config.dbfilename);
	}
	const key = commands[index + 1];
	if (!(key in dictionary) && !(key in replicaDict)) {
		return getBulkString(null);
	}
	if (key in replicaDict) {
		return getBulkString(replicaDict[key]);
	}
	return getBulkString(dictionary[key]);
}

async function xreadStreams(
	keys: string[],
	ids: string[],
	delay = 0,
): Promise<Array<any>> {
	return new Promise((resolve) => {
		setTimeout(() => {
			const res: Array<any> = [];
			console.log("Keys", keys, "IDs", ids);
			console.log("Stream Key", streamKey);

			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				const id = ids[i];
				if (!key || !id) {
					console.error(
						`Key or ID is undefined for index ${i}. Key: ${key}, ID: ${id}`,
					);
					continue; // Skip this iteration if either is undefined
				}

				const [minTime, minVersion] = id.split("-").map(Number);

				if (streamKey[key]) {
					const matchingEntries = [];
					for (const strm of streamKey[key]) {
						const [time, version] = strm.id.split("-").map(Number);
						if (time > minTime || (time === minTime && version > minVersion)) {
							matchingEntries.push([
								strm.id,
								strm.pairs.flatMap((pair) => [pair.key, pair.value]),
							]);
						}
					}
					if (matchingEntries.length > 0) {
						res.push([key, matchingEntries]);
					}
				} else {
					console.error(`Stream key "${key}" does not exist.`);
				}
			}
			resolve(res);
		}, delay);
	});
}

async function propagateToReplicas(command: string): Promise<void> {
	// Assuming replicas is an array of replica connections
	const replicas: Connection[] = [];
	for (const replica of replicas) {
		replica.write(command);
		await new Promise<void>((resolve) => {
			replica.once("data", (data) => {
				const commands = data.toString().split("\r\n");
				if (commands.includes("ACK")) {
					// Handle ACK
				}
				resolve();
			});
		});
	}
}

function waitCommand(
	howMany: number,
	time: number,
	connection: Connection,
): void {
	const numOfAcks = 0;
	const propagatedCommands = 0;
	const handshakes = 0;
	if (propagatedCommands === 0) {
		connection.write(`:${handshakes}\r\n`);
	} else {
		propagateToReplicas(
			`*3\r\n${getBulkString("REPLCONF")}${getBulkString("GETACK")}${getBulkString("*")}`,
		);
		setTimeout(() => {
			connection.write(`:${Math.min(howMany, numOfAcks)}\r\n`);
		}, time);
	}
}