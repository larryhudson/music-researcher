import {search} from "@src/utils/spotify";

export async function get({ url, cookies }) {
	const searchQuery = url.searchParams.get('q');
	const searchType = url.searchParams.get('type') || 'artist';
	const authToken = cookies.get('spotify-auth-token').value;

	const searchResults = await search({searchType, searchQuery, authToken});

	return {
		body: JSON.stringify(searchResults)
	}
}
