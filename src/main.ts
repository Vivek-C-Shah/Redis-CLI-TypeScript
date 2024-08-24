import { startServer } from "./server";
import { handleHandshake } from "./handshake";
import { config, PORT, isSlave, masterPort } from "./config";

console.log("Starting Redis-like server...");

if (isSlave && masterPort) {
	console.log(
		`Server is running as a slave. Connecting to master on port ${masterPort}...`,
	);
	handleHandshake(masterPort);
} else {
	console.log(`Server is running as a master on port ${PORT}.`);
}

startServer(PORT);
