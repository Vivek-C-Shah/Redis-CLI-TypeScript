export interface Config {
	dir?: string;
	dbfilename?: string;
}

export interface RedisCommand {
	command: string;
	args: string[];
}

export interface ReplicaDict {
	[key: string]: string;
}

export interface StreamPair {
	key: string;
	value: string;
}

export class Stream {
	key: string;
	id: string;
	pairs: StreamPair[];

	constructor(key: string, id: string) {
		this.key = key;
		this.id = id;
		this.pairs = [];
	}
}


export interface TimeToVersion {
	[timestamp: string]: string[];
}

export interface Dictionary {
	[key: string]: string;
}

export interface RedisResponse {
	type: string;
	data: string | RedisResponse[] | null;
}

export interface BulkArray {
	length: number;
	items: Array<string | BulkArray>;
}

export interface HandshakeResponse {
	firstAck: boolean;
	offset: number;
	repl1: boolean;
}

export type ExecQueue = Array<string[]>;

export interface ServerConfig {
	port: number;
	isSlave: boolean;
	masterPort: number;
}

export interface StreamKey {
	[key: string]: Stream[];
}

import type * as net from 'node:net';

export interface Connection extends net.Socket {
	type?: "client" | "replica";
}
