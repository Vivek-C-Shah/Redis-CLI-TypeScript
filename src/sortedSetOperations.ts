import type { RedisSortedSets } from './types';

const sortedSets: RedisSortedSets = {};

// ZADD - Adds a member with a score to the sorted set
export function zadd(
	key: string,
	scoreMembers: Array<[number, string]>,
): number {
	if (!sortedSets[key]) {
		sortedSets[key] = new Map();
	}

	let addedCount = 0;
	for (const [score, member] of scoreMembers) {
		if (!sortedSets[key].has(member)) {
			addedCount++;
		}
		sortedSets[key].set(member, score);
	}

	return addedCount;
}

// ZREM - Removes the specified member from the sorted set
export function zrem(key: string, members: string[]): number {
	if (!sortedSets[key]) return 0;

	let removedCount = 0;
	for (const member of members) {
		if (sortedSets[key].delete(member)) {
			removedCount++;
		}
	}

	return removedCount;
}

// ZSCORE - Returns the score of the member in the sorted set
export function zscore(key: string, member: string): number | null {
	if (!sortedSets[key]) return null;
	return sortedSets[key].get(member) || null;
}

// ZRANK - Returns the rank of the member in the sorted set
export function zrank(key: string, member: string): number | null {
	if (!sortedSets[key]) return null;

	const sortedArray = Array.from(sortedSets[key].entries()).sort(
		(a, b) => a[1] - b[1],
	);
	for (let i = 0; i < sortedArray.length; i++) {
		if (sortedArray[i][0] === member) {
			return i;
		}
	}

	return null;
}

// ZRANGE - Returns the members in the specified range
export function zrange(key: string, start: number, stop: number): string[] {
	if (!sortedSets[key]) return [];

	const sortedArray = Array.from(sortedSets[key].entries()).sort(
		(a, b) => a[1] - b[1],
	);
	if (stop < 0) stop = sortedArray.length + stop;

	return sortedArray.slice(start, stop + 1).map(([member]) => member);
}
