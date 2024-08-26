import type { RedisLists } from "./types";
const lists: RedisLists = {};

// LPUSH - Adds an element to the head of the list
export function lpush(key: string, values: string[]): number {
	if (!lists[key]) {
		lists[key] = [];
	}
	lists[key] = [...values, ...lists[key]];
	return lists[key].length;
}

// RPUSH - Adds an element to the tail of the list
export function rpush(key: string, values: string[]): number {
	if (!lists[key]) {
		lists[key] = [];
	}
	lists[key].push(...values);
	return lists[key].length;
}

// LPOP - Removes and returns the first element of the list
export function lpop(key: string): string | null {
	if (!lists[key] || lists[key].length === 0) {
		return null;
	}
	return lists[key].shift() || null;
}

// RPOP - Removes and returns the last element of the list
export function rpop(key: string): string | null {
	if (!lists[key] || lists[key].length === 0) {
		return null;
	}
	return lists[key].pop() || null;
}

// LLEN - Returns the length of the list
export function llen(key: string): number {
	if (!lists[key]) {
		return 0;
	}
	return lists[key].length;
}

// LRANGE - Returns a range of elements from the list
export function lrange(key: string, start: number, stop: number): string[] {
	if (!lists[key]) {
		return [];
	}

	const list = lists[key];
	const end = stop >= 0 ? stop + 1 : list.length + stop + 1;

	return list.slice(start, end);
}

// LTRIM - Trims the list to the specified range
export function ltrim(key: string, start: number, stop: number): string {
	if (!lists[key]) {
		return "+OK\r\n";
	}

	const list = lists[key];
	const end = stop >= 0 ? stop + 1 : list.length + stop + 1;

	lists[key] = list.slice(start, end);
	return "+OK\r\n";
}

// LMOVE - Atomically moves elements from one list to another
export function lmove(
	source: string,
	destination: string,
	whereFrom: string,
	whereTo: string,
): string | null {
	let value: string | null = null;

	if (whereFrom === "left") {
		value = lpop(source);
	} else if (whereFrom === "right") {
		value = rpop(source);
	}

	if (value !== null) {
		if (whereTo === "left") {
			lpush(destination, [value]);
		} else if (whereTo === "right") {
			rpush(destination, [value]);
		}
	}

	return value;
}

// LINDEX - Returns the element at the specified index
export function lindex(key: string, index: number): string | null {
    if (!lists[key] || index < 0 || index >= lists[key].length) {
        return null;
    }
    return lists[key][index];
}

// LSET - Sets the element at the specified index
export function lset(key: string, index: number, value: string): string {
    if (!lists[key] || index < 0 || index >= lists[key].length) {
        return "-ERR index out of range\r\n";
    }
    lists[key][index] = value;
    return "+OK\r\n";
}

// LREM - Removes elements from the list
export function lrem(key: string, count: number, value: string): number {
    if (!lists[key]) {
        return 0;
    }

    let removed = 0;
    let index = 0;
    while (index < lists[key].length) {
        if (lists[key][index] === value) {
            lists[key].splice(index, 1);
            removed++;
            if (count > 0 && removed >= count) {
                break;
            }
        } else {
            index++;
        }
    }

    return removed;
}

// LINSERT - Inserts an element before or after another element
export function linsert(
    key: string,
    where: string,
    pivot: string,
    value: string,
): number {
    if (!lists[key]) {
        return -1;
    }

    const index = lists[key].indexOf(pivot);
    if (index === -1) {
        return -1;
    }

    if (where === "before") {
        lists[key].splice(index, 0, value);
    } else if (where === "after") {
        lists[key].splice(index + 1, 0, value);
    }

    return lists[key].length;
}

// LGETALL - Returns all elements in the list
export function lgetall(key: string): string[] {
    if (!lists[key]) {
        return [];
    }
    return lists[key];
}