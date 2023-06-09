
import {lookupTracksForAlbumByQuery} from "@src/utils/spotify";

export async function get({ url, cookies }) {
	const artistName = url.searchParams.get('artist');
	const albumName = url.searchParams.get('album');
	const authToken = cookies.get('spotify-auth-token').value;

	const tracks = await lookupTracksForAlbumByQuery({artistName, albumName, authToken})
	return {
		body: JSON.stringify(tracks)
	}
}
