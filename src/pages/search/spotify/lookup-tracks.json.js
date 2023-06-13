
import {lookupTracksByQuery} from "@src/utils/spotify";

export async function get({ url, cookies }) {
	const artistName = url.searchParams.get('artist');
	const albumName = url.searchParams.get('album');
	const searchType = url.searchParams.get('searchType');
	const authToken = cookies.get('spotify-auth-token').value;

	const data = await lookupTracksByQuery({artistName, albumName, searchType, authToken})
	return {
		body: JSON.stringify(data)
	}
}
