import cheerio from "cheerio";

export function getAppUrlFromDiscogsUrl(discogsUrl) {
    const regex = /https:\/\/www\.discogs\.com\/(.*)/;
    console.log({discogsUrl});
    const match = discogsUrl.match(regex);
    if (match && match.length > 1) {
	const extractedPart = match[1];
	return `/discogs/` + extractedPart;
    }
}
export async function search({ searchType, query }: {searchType: string, query: string}) {

	const searchUrl = new URL("https://www.discogs.com/search/ac?searchType=all&type=a_m_r_13");
    searchUrl.searchParams.set('q', query);

    if (searchType) {
        searchUrl.searchParams.set('searchType', searchType);
    }

    console.log({searchUrl, query});
	const response = await fetch(searchUrl);

	if (!response.ok) {
		throw new Error(response.statusText);
	}

	const responseJson = await response.json()

	const searchResults = responseJson;
    return searchResults;

}

export async function findDiscogsArtist({artistName, releaseNames}): {artistName: string, releaseNames: string[]} {
  // this is going to search Discogs for the releases, and try to find the matching artist

  for (let releaseName of releaseNames) {

  }
}

function extractCreditsFromDsData(dsData) {
// return null;
    if (!dsData) return null;
    const releaseKey = Object.keys(dsData.data)[1];
if (!dsData.data[releaseKey]?.releaseCredits) return null;

    const credits = dsData.data[releaseKey].releaseCredits.map(credit => {
    return {
        ...credit,
        ...dsData.data[credit.artist['__ref']]
    };
    })
return credits;
}

export async function getDiscogsItemData({itemId, itemType} : {itemId: string, itemType: string}) {
    // fetch the URL
    const itemUrl = `https://discogs.com/${itemType}/${itemId}`;
    // get the release_schema script tag
    const response = await fetch(itemUrl);
    const responseHtml = await response.text();
    const $ = cheerio.load(responseHtml);
    let itemData, dsData, releaseCredits;
    try {

	const itemDataJson = $(`#${itemType}_schema`).text();
	itemData = JSON.parse(itemDataJson);

	const dsDataJson = $('#dsdata').text();
	dsData = JSON.parse(dsDataJson);
    } catch {
    }
    releaseCredits = extractCreditsFromDsData(dsData);
    return {itemData, dsData, releaseCredits}
}
