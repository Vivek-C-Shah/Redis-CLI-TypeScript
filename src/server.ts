import net from "node:net";
import { handleCommand } from "./redisCommands";
import { PORT } from "./config";

export function startServer(port: number): void {
	const server = net.createServer((connection) => {
		console.log("Client connected");

		connection.on("data", async (data: Buffer) => {
			try {
				const commandString = data.toString();
				console.log("Received command:", commandString);

				// Handle the command and get the response
				const response = await handleCommand(commandString, connection);

				// Send the response back to the client
				if (response !== null) {
					connection.write(response);
				}
			} catch (error) {
				console.error("Error handling command:", error);
				connection.write("-ERR internal server error\r\n");
			}
		});

		connection.on("end", () => {
			console.log("Client disconnected");
		});

		connection.on("error", (error) => {
			console.error("Connection error:", error);
		});
	});

	server.listen(port, "127.0.0.1", () => {
		console.log(`Server listening on port ${port}`);
	});

	server.on("error", (error) => {
		console.error("Server error:", error);
	});
}
