import cheerio from "cheerio";

export function getAppUrlFromDiscogsUrl(discogsUrl) {
    
    if (discogsUrl.startsWith('/')) {
	return `/discogs` + discogsUrl; 
    }

    const regex = /https:\/\/www\.discogs\.com\/(.*)/;
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

function extractReleaseGroupsFromArtistHtml($) {

    const groupHeaders = $('tr.credit_header h3')

    // add class to header tbody tags so we can use nextUntil on them
    $(groupHeaders).each((_, h3Tag) => {
	const tbodyTag = $(h3Tag).closest('tbody');
	$(tbodyTag).addClass('has-header');
    })

    const groups = $('tbody.has-header').map((_, tbodyWithHeader) => {
	const groupName = $(tbodyWithHeader).find('h3').text().trim();
	const tagsBetweenHeaders = $(tbodyWithHeader).nextUntil('tbody.has-header').addBack();

	const releaseTrsInGroup = $(tagsBetweenHeaders).find('tr.main');

	const releasesInGroup = $(releaseTrsInGroup).map((_, trTag) => {
	    const $trTag = $(trTag);
	    const $titleLink = $trTag.find('td.title > a');
	    const $artistLinks = $trTag.find('.artist_in_title a').length > 0 ? (
		$trTag.find('.artist_in_title a')) : ($trTag.find('td.artist a'))

	    return {
		artists: $artistLinks.map((_, aTag) => {
		    const $aTag = $(aTag);
		    return {
			name: $aTag.text().trim(),
			url: getAppUrlFromDiscogsUrl($aTag.attr('href'))
		    }
	    }).get(),
		title: $titleLink.text().trim(),
		url: getAppUrlFromDiscogsUrl($titleLink.attr('href')),
		labels: $trTag.find('td.label a').map((_, aTag) => {
		    const $aTag = $(aTag);
		    return {
			name: $aTag.text().trim(),
			url: getAppUrlFromDiscogsUrl($aTag.attr('href'))
		    }
	    }).get(),
		year: $trTag.find('td.year').text().trim(),
		img: $trTag.find('.thumbnail_center img').attr('data-src')
	    }}).get();

    return {name: groupName, releases: releasesInGroup};
    }).get();

    return groups;
}

function extractReleasesFromLabelHtml($) {
    const releaseTrs = $('tr.main')

    const labelName = $('h1.label-heading').text().trim();
    const labelUrl = getAppUrlFromDiscogsUrl($('meta[property="og:url"]').attr('content'));

    const releases = $(releaseTrs).map((_, trTag) => {

	return {
	    artists: $(trTag).find('td.artist a').map((_, aTag) => {
		return {
		    name: $(aTag).text().trim(),
		    url: getAppUrlFromDiscogsUrl($(aTag).attr('href'))
	    }}).get(),
	    title: $(trTag).find('td.title a').text().trim(),
	    url: getAppUrlFromDiscogsUrl($(trTag).find('td.title a').attr('href')),
	    // format has brackets around it so we slice them off
	    format: $(trTag).find('td.title .format').text().trim().slice(1, -1),
	    year: $(trTag).find('td.year').text().trim(),
	    img: $(trTag).find('.thumbnail_center img').attr('data-src'),
	    labels: [{name: labelName, url: labelUrl}]
	}
    }).get()

    return releases;
}

export async function getDiscogsItemData({itemId, itemType} : {itemId: string, itemType: string}) {
    // fetch the URL
    const itemUrl = new URL(`https://discogs.com/${itemType}/${itemId}`);
    if (itemType === 'artist') {
	itemUrl.searchParams.set('sort', 'year,desc');
	itemUrl.searchParams.set('limit', '500');
    }
    // get the release_schema script tag
    const response = await fetch(itemUrl);
    const responseHtml = await response.text();
    const $ = cheerio.load(responseHtml);
    let itemData, dsData, releaseCredits, releases;
    try {

	const itemDataJson = $(`#${itemType}_schema`).text();
	itemData = JSON.parse(itemDataJson);

	const dsDataJson = $('#dsdata').text();
	dsData = JSON.parse(dsDataJson);
    } catch {
    }
    releaseCredits = extractCreditsFromDsData(dsData);
    const releaseGroups = extractReleaseGroupsFromArtistHtml($);
    
    if (itemType === 'label') {
	releases = extractReleasesFromLabelHtml($);
    }
    return {itemData, dsData, releaseCredits, releaseGroups, releases}
}
