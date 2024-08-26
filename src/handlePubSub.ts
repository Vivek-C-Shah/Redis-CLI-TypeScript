import type { Connection, PubSubChannels, Subscriber } from "./types";

const channels: PubSubChannels = {};

export function subscribe(channel: string, subscriber: Subscriber): void {
	console.log("Channel", channels);
	try {
		if (!channels[channel]) {
			channels[channel] = [];
		}
		channels[channel].push(subscriber);
	} catch (error) {
		console.error("Error occurred while subscribing:", error);
	}
}

export function unsubscribe(channel: string, subscriber: Subscriber): void {
	if (!channels[channel]) return;
	channels[channel] = channels[channel].filter((sub) => sub !== subscriber);
}

export function publish(channel: string, message: string): void {
	if (!channels[channel]) return;

	for (const subscriber of channels[channel]) {
		// Send the message to the subscriber in the correct format
		const formattedMessage = `*3\r\n$7\r\nmessage\r\n$${channel.length}\r\n${channel}\r\n$${message.length}\r\n${message}\r\n`;
		subscriber(formattedMessage);
	}
}

// Redis command handlers
export function handleSubscribe(
	commands: string[],
	connection: Connection,
): string {
	const channel = commands[(commands.indexOf("subscribe") || commands.indexOf("sub")) + 1];
	const subscriber = (message: string) => {
		connection.write(message); // Sends the message directly to the connected client
	};

	subscribe(channel, subscriber);

	return `*3\r\n$9\r\nsubscribe\r\n$${channel.length}\r\n${channel}\r\n:1\r\n`;
}

export function handleUnsubscribe(commands: string[]): string {
	const channel = commands[(commands.indexOf("unsubscribe") || commands.indexOf("pub")) + 1];
	unsubscribe(channel, (message: string) =>
		console.log(`Received message on ${channel}: ${message}`),
	);

	const remainingSubscriptions = Object.keys(channels).length;
	return `*3\r\n$11\r\nunsubscribe\r\n$${channel.length}\r\n${channel}\r\n:${remainingSubscriptions}\r\n`;
}

export function handlePublish(commands: string[]): string {
	const pubIndex = (commands.indexOf("publish") || commands.indexOf("pub"));
	const channel = commands[pubIndex + 1];
	const message = commands.slice(pubIndex + 2).join(" ");
	console.log("Channel", channel, "Message", message);
	publish(channel, message);

	const numSubscribers = channels[channel] ? channels[channel].length : 0;
	return `:${numSubscribers}\r\n`;
}
