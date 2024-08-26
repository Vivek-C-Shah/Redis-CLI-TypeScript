import type { GeoIndex } from "./types";
const geoIndex: GeoIndex = {};

// GEOADD - Adds one or more members to a geospatial index
export function geoadd(
	key: string,
	members: Array<[number, number, string]>,
): number {
	if (!geoIndex[key]) {
		geoIndex[key] = new Map();
	}

	for (const [longitude, latitude, member] of members) {
		geoIndex[key].set(member, { longitude, latitude });
	}

	return geoIndex[key].size;
}

// GEODIST - Returns the distance between two members of a geospatial index
function haversineDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const toRad = (angle: number) => (Math.PI / 180) * angle;
	const R = 6371; // Earth's radius in kilometers
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
			Math.cos(toRad(lat2)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export function geodist(
	key: string,
	member1: string,
	member2: string,
): string | null {
	const index = geoIndex[key];
	if (!index) return null;

	const pos1 = index.get(member1);
	const pos2 = index.get(member2);
	if (!pos1 || !pos2) return null;

	const distance = haversineDistance(
		pos1.latitude,
		pos1.longitude,
		pos2.latitude,
		pos2.longitude,
	);
	return `${distance}`;
}

// GEOHASH - Returns members from a geospatial index as geohash strings
export function geohash(key: string, members: string[]): Array<string | null> {
	const index = geoIndex[key];
	if (!index) return members.map(() => null);

	// Dummy geohash function for example purposes
	const toGeohash = (lat: number, lon: number) => `${lat},${lon}`;

	return members.map((member) => {
		const pos = index.get(member);
		return pos ? toGeohash(pos.latitude, pos.longitude) : null;
	});
}

// GEOPOS - Returns the longitude and latitude of members from a geospatial index
export function geopos(
	key: string,
	members: string[],
): Array<[number, number] | null> {
	const index = geoIndex[key];
	if (!index) return members.map(() => null);

	return members.map((member) => {
		const pos = index.get(member);
		return pos ? [pos.longitude, pos.latitude] : null;
	});
}

// GEORADIUS - Queries a geospatial index for members within a distance from a coordinate
export function georadius(
	key: string,
	longitude: number,
	latitude: number,
	radius: number,
): string[] {
	const index = geoIndex[key];
	if (!index) return [];

	const results: string[] = [];

	index.forEach((pos, member) => {
		const distance = haversineDistance(
			latitude,
			longitude,
			pos.latitude,
			pos.longitude,
		);
		if (distance <= radius) {
			results.push(member);
		}
	});

	return results;
}

export const georadius_ro = georadius;

// GEORADIUSBYMEMBER - Queries a geospatial index for members within a distance from a member
export function georadiusbymember(
	key: string,
	member: string,
	radius: number,
): string[] {
	const index = geoIndex[key];
	if (!index) return [];

	const pos = index.get(member);
	if (!pos) return [];

	return georadius(key, pos.longitude, pos.latitude, radius);
}

export const georadiusbymember_ro = georadiusbymember;

// GEOSEARCH - Queries a geospatial index for members inside an area of a box or a circle
export function geosearch(
	key: string,
	longitude: number,
	latitude: number,
	radius: number,
): string[] {
	// In this simple example, it's treated the same as GEORADIUS
	return georadius(key, longitude, latitude, radius);
}

// GEOSEARCHSTORE - Queries a geospatial index for members inside an area and stores the result
export function geosearchstore(
	destination: string,
	key: string,
	longitude: number,
	latitude: number,
	radius: number,
): number {
	const results = geosearch(key, longitude, latitude, radius);
	geoIndex[destination] = new Map(
		results.map((member) => {
			const value = geoIndex[key].get(member);
			if (value === undefined) {
				throw new Error(`Member ${member} not found in geoIndex for key ${key}`);
			}
			return [member, value];
		}),
	);
	return results.length;
}