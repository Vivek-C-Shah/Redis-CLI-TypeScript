import net from "node:net";
import {
	getBulkString,
	readData,
	parseRedisResponseFromMaster,
} from "./helpers";
import type { ReplicaDict } from "./types";
import { PORT } from "./config";

const replicaDict: ReplicaDict = {};

export function handleHandshake(masterPort: number): void {
	const client = net.createConnection(
		{ host: "localhost", port: masterPort },
		() => {
			console.log("Connected to master", "Port:", masterPort);

			client.write("*1\r\n$4\r\nPING\r\n");
			let firstAck = false;
			let offset = 0;
			let repl1 = false;

			client.on("data", async (data: Buffer) => {
				try {
					const dat = await readData(data);
					console.log("This is the data", dat);
					let message = Buffer.from(dat).toString();
					let commands = message.split("\r\n");
					console.log("Commands", commands);

					while (message.length > 0) {
						const index = message.indexOf("*", 1);
						let query: string;

						if (index === -1) {
							query = message;
							message = "";
						} else {
							query = message.substring(0, index);
							message = message.substring(index);
						}

						commands = Buffer.from(query).toString().split("\r\n");

						if (commands[0] === "+PONG") {
							client.write(
								`*3\r\n${getBulkString("REPLCONF")}${getBulkString("listening-port")}${getBulkString(PORT.toString())}`,
							);
						}

						if (commands[0] === "+OK") {
							if (!repl1) {
								client.write(
									`*3\r\n${getBulkString("REPLCONF")}${getBulkString("capa")}${getBulkString("psync2")}`,
								);
								repl1 = true;
							} else {
								client.write(
									`*3\r\n${getBulkString("PSYNC")}${getBulkString("?")}${getBulkString("-1")}`,
								);
							}
						}

						if (commands.includes("PING")) {
							if (firstAck) {
								offset += 14;
							}
						}

						if (commands.includes("SET") || commands.includes("GET")) {
							if (firstAck) {
								offset += query.length;
							}
							parseRedisResponseFromMaster(query, replicaDict);
						}

						if (commands.includes("REPLCONF")) {
							client.write(
								`*3\r\n${getBulkString("REPLCONF")}${getBulkString("ACK")}${getBulkString(offset.toString())}`,
							);
							firstAck = true;
							offset += 37;
						}
					}
				} catch (error) {
					console.error(error);
					client.destroy();
				}
			});
		},
	);

	client.on("error", (error) => {
		console.error("Connection error:", error);
		client.destroy();
	});

	client.on("end", () => {
		console.log("Disconnected from master");
	});
}
