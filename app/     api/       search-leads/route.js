import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACE_DETAILS_BASE_URL = "https://places.googleapis.com/v1/places";

function buildQuery(keyword, city, country) {
  const cleanKeyword = String(keyword || "").trim();
  const cleanCity = String(city || "").trim();
  const cleanCountry = String(country || "").trim();

  const parts = [cleanKeyword];
  if (cleanCity) parts.push(`in ${cleanCity}`);
  if (cleanCountry) parts.push(cleanCountry);

  return parts.join(", ");
}

function normalizeMaxResults(value) {
  const number = Number(value);
  if (Number.isNaN(number) || number < 1) return 10;
  if (number > 20) return 20;
  return number;
}

async function textSearch(query, maxResults, apiKey) {
  const response = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.types"
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: maxResults,
      languageCode: "en"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Text Search failed: ${errorText}`);
  }

  return response.json();
}

async function placeDetails(placeId, apiKey) {
  const response = await fetch(`${PLACE_DETAILS_BASE_URL}/${placeId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,googleMapsUri,businessStatus,types"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Place Details failed for ${placeId}: ${errorText}`);
  }

  return response.json();
}

export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing GOOGLE_MAPS_API_KEY. Add it to .env.local and Vercel environment variables."
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const keyword = String(body.keyword || "").trim();
    const city = String(body.city || "").trim();
    const country = String(body.country || "").trim();
    const noWebsiteOnly = Boolean(body.noWebsiteOnly);
    const maxResults = normalizeMaxResults(body.maxResults);

    if (!keyword || !city) {
      return NextResponse.json(
        { error: "Keyword and city are required." },
        { status: 400 }
      );
    }

    const query = buildQuery(keyword, city, country);
    const searchData = await textSearch(query, maxResults, apiKey);
    const places = Array.isArray(searchData.places) ? searchData.places : [];

    const detailedResults = await Promise.all(
      places.map(async (place) => {
        try {
          const details = await placeDetails(place.id, apiKey);

          return {
            placeId: details.id || place.id || "",
            name: details.displayName?.text || place.displayName?.text || "N/A",
            address:
              details.formattedAddress || place.formattedAddress || "N/A",
            phone: details.nationalPhoneNumber || "",
            website: details.websiteUri || "",
            hasWebsite: Boolean(details.websiteUri),
            mapsUrl:
              details.googleMapsUri ||
              (place.id
                ? `https://www.google.com/maps/place/?q=place_id:${place.id}`
                : ""),
            businessStatus: details.businessStatus || "",
            category:
              Array.isArray(details.types) && details.types.length > 0
                ? details.types[0]
                : Array.isArray(place.types) && place.types.length > 0
                ? place.types[0]
                : ""
          };
        } catch (error) {
          return {
            placeId: place.id || "",
            name: place.displayName?.text || "N/A",
            address: place.formattedAddress || "N/A",
            phone: "",
            website: "",
            hasWebsite: false,
            mapsUrl: place.id
              ? `https://www.google.com/maps/place/?q=place_id:${place.id}`
              : "",
            businessStatus: "",
            category:
              Array.isArray(place.types) && place.types.length > 0
                ? place.types[0]
                : "",
            detailsError: error.message
          };
        }
      })
    );

    const filteredResults = noWebsiteOnly
      ? detailedResults.filter((item) => !item.hasWebsite)
      : detailedResults;

    return NextResponse.json({
      success: true,
      query,
      count: filteredResults.length,
      results: filteredResults
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Something went wrong while fetching leads."
      },
      { status: 500 }
    );
  }
}
