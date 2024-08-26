import {
	geoadd,
	geodist,
	geohash,
	geopos,
	georadius,
	georadiusbymember,
	geosearch,
	geosearchstore,
} from "./geoCommands";
import { getBulkArray } from "./helpers";

import type { Connection } from "./types";

export function handleGeoCommands(
	commands: string[],
	connection: Connection,
): string {
	if (commands.includes("geoadd")) {
		const key = commands[commands.indexOf("geoadd") + 1];
		const members: Array<[number, number, string]> = [];
		for (let i = commands.indexOf("geoadd") + 2; i < commands.length; i += 3) {
			const longitude = Number.parseFloat(commands[i]);
			const latitude = Number.parseFloat(commands[i + 1]);
			const member = commands[i + 2];
			members.push([longitude, latitude, member]);
		}
		return `:${geoadd(key, members)}\r\n`;
	}

	if (commands.includes("geodist")) {
		const key = commands[commands.indexOf("geodist") + 1];
		const member1 = commands[commands.indexOf("geodist") + 2];
		const member2 = commands[commands.indexOf("geodist") + 3];
		const distance = geodist(key, member1, member2);
		return distance ? `$${distance.length}\r\n${distance}\r\n` : "$-1\r\n";
	}

	if (commands.includes("geohash")) {
		const key = commands[commands.indexOf("geohash") + 1];
		const members = commands.slice(commands.indexOf("geohash") + 2);
		const hashes = geohash(key, members);
		return getBulkArray(hashes);
	}

	if (commands.includes("geopos")) {
		const key = commands[commands.indexOf("geopos") + 1];
		const members = commands.slice(commands.indexOf("geopos") + 2);
		const positions = geopos(key, members);
		return getBulkArray(
			positions.map((pos) => (pos ? `${pos[0]},${pos[1]}` : null)),
		);
	}

	if (commands.includes("georadius")) {
		const key = commands[commands.indexOf("georadius") + 1];
		const longitude = Number.parseFloat(
			commands[commands.indexOf("georadius") + 2],
		);
		const latitude = Number.parseFloat(
			commands[commands.indexOf("georadius") + 3],
		);
		const radius = Number.parseFloat(
			commands[commands.indexOf("georadius") + 4],
		);
		const members = georadius(key, longitude, latitude, radius);
		return getBulkArray(members);
	}

	if (commands.includes("georadiusbymember")) {
		const key = commands[commands.indexOf("georadiusbymember") + 1];
		const member = commands[commands.indexOf("georadiusbymember") + 2];
		const radius = Number.parseFloat(
			commands[commands.indexOf("georadiusbymember") + 3],
		);
		const members = georadiusbymember(key, member, radius);
		return getBulkArray(members);
	}

	if (commands.includes("geosearch")) {
		const key = commands[commands.indexOf("geosearch") + 1];
		const longitude = Number.parseFloat(
			commands[commands.indexOf("geosearch") + 2],
		);
		const latitude = Number.parseFloat(
			commands[commands.indexOf("geosearch") + 3],
		);
		const radius = Number.parseFloat(
			commands[commands.indexOf("geosearch") + 4],
		);
		const members = geosearch(key, longitude, latitude, radius);
		return getBulkArray(members);
	}

	if (commands.includes("geosearchstore")) {
		const destination = commands[commands.indexOf("geosearchstore") + 1];
		const key = commands[commands.indexOf("geosearchstore") + 2];
		const longitude = Number.parseFloat(
			commands[commands.indexOf("geosearchstore") + 3],
		);
		const latitude = Number.parseFloat(
			commands[commands.indexOf("geosearchstore") + 4],
		);
		const radius = Number.parseFloat(
			commands[commands.indexOf("geosearchstore") + 5],
		);
		const count = geosearchstore(destination, key, longitude, latitude, radius);
		return `:${count}\r\n`;
	}

    return "-ERR unknown command\r\n";
}
