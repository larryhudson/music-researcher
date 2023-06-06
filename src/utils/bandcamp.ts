import cheerio from "cheerio";

export function extractArtistIdFromSubdomain(url) : {url: string} {
    const regex = /https:\/\/(.+?)\.bandcamp\.com/;
    const matches = url.match(regex);

    console.log({url});
    if (matches && matches.length > 1) {
        const artistId = matches[1];
        console.log(artistId); // Output: exampleartist
        return artistId;
    } else {
        console.log("Unable to extract artist ID");
	return url;
        throw new Error("Unable to extract artist ID from URL", url);
    }

}

export async function search({ searchType, query }) {
	const filterKeyForType = {
		artist: 'b',
		album: 'a',
		track: 't',
	}

	const filterKey = searchType ? filterKeyForType[searchType] : ""

	const searchUrl = "https://bandcamp.com/api/bcsearch_public_api/1/autocomplete_elastic";

	const searchData = { "search_text": query, "fan_id": null, "full_page": false, "search_filter": filterKey }

	console.log(JSON.stringify(searchData, null, 2));

	const response = await fetch(
		searchUrl,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(searchData)
		}
	)

	if (!response.ok) {
		throw new Error(response.statusText);
	}

	const responseJson = await response.json()

	const searchResults = responseJson.auto.results;
	return searchResults;

}

export async function getArtistDataFromHomePage({artistId}: {artistId: string}) { 
    const artistHomeUrl = `https://${artistId}.bandcamp.com/`
    const response = await fetch(artistHomeUrl);
    const responseHtml = await response.text();
    const $ = cheerio.load(responseHtml);

    const name = $('#band-name-location .title').text();
    const location = $('#band-name-location .location').text();

    const releases = $('li[data-item-id]').map((_, liTag) => {
        const $liTag = $(liTag);
        return {
            id: $liTag.attr('data-item-id'),
            title: $liTag.find('.title').text().trim(),
            imgUrl: $liTag.find('img').attr('src'),
            url: $liTag.find('a').attr('href')
        }
    }).get();

    return {
        releases,
        name,
        location
    };
}

