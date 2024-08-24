// Extract command-line arguments
const portIndex = process.argv.indexOf("--port");
const isSlaveIndex = process.argv.indexOf("--replicaof");
const dirIndex = process.argv.indexOf("--dir");
const dbfilenameIndex = process.argv.indexOf("--dbfilename");

// Exported configuration object
export const config = {
	dir: dirIndex !== -1 ? process.argv[dirIndex + 1] : undefined,
	dbfilename:
		dbfilenameIndex !== -1 ? process.argv[dbfilenameIndex + 1] : undefined,
	isSlave: isSlaveIndex !== -1,
	masterPort:
		isSlaveIndex !== -1
			? Number.parseInt(process.argv[isSlaveIndex + 1].split(" ")[1], 10)
			: 0,
};

// Constants
export const PORT =
	portIndex !== -1 ? Number.parseInt(process.argv[portIndex + 1], 10) : 6379;
export const isSlave = isSlaveIndex !== -1;
export let masterPort = 0;

if (isSlave && isSlaveIndex !== -1) {
	masterPort = Number.parseInt(process.argv[isSlaveIndex + 1].split(" ")[1], 10);
}

// Additional constants that might be used across the project
export const CURRENT_YEAR = 2024;
export const FC = 0xfc; // Example value for FC, typically ASCII value or other relevant constant
export const FB = 0xfb; // Example value for FB, typically ASCII value or other relevant constant
export const FD = 0xfd; // Example value for FD, typically ASCII value or other relevant constant
