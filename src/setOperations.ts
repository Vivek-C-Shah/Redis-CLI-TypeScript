import type { RedisSets } from "./types";

const sets: RedisSets = {};

// SADD - Adds a new member to a set
export function sadd(key: string, members: string[]): number {
	if (!sets[key]) {
		sets[key] = new Set();
	}

	let addedCount = 0;
	for (const member of members) {
		if (!sets[key].has(member)) {
			sets[key].add(member);
			addedCount++;
		}
	}

	return addedCount;
}

// SREM - Removes the specified member from the set
export function srem(key: string, members: string[]): number {
	if (!sets[key]) return 0;

	let removedCount = 0;
	for (const member of members) {
		if (sets[key].delete(member)) {
			removedCount++;
		}
	}

	return removedCount;
}

// SISMEMBER - Tests a string for set membership
export function sismember(key: string, member: string): number {
	if (!sets[key]) return 0;
	return sets[key].has(member) ? 1 : 0;
}

// SINTER - Returns the set of members that two or more sets have in common
export function sinter(keys: string[]): string[] {
	if (keys.length === 0) return [];

	const result = [...(sets[keys[0]] || [])];
	for (const key of keys.slice(1)) {
		const currentSet = sets[key];
		if (!currentSet) return [];
		for (let i = 0; i < result.length; i++) {
			if (!currentSet.has(result[i])) {
				result.splice(i, 1);
				i--;
			}
		}
	}

	return result;
}

// SCARD - Returns the size (a.k.a. cardinality) of a set
export function scard(key: string): number {
	if (!sets[key]) return 0;
	return sets[key].size;
}
