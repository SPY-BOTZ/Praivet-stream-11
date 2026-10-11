import re
import urllib.parse
import urllib.request
import json
import asyncio
from typing import Optional, Dict, Any
import config
from utils.logger import Logger

logger = Logger(__name__)

# Try importing aiohttp, fallback to urllib if not installed
try:
    import aiohttp
except ImportError:
    aiohttp = None

# Common video file extensions
VIDEO_EXTENSIONS = {
    ".mp4", ".mkv", ".webm", ".mov", ".avi", ".flv", ".wmv", ".m4v", ".ts", ".3gp", ".ogv"
}

def clean_movie_title(raw_name: str) -> tuple[str, Optional[str]]:
    """
    Cleans messy video filenames like:
    'Inception.2010.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4'
    Returns: ('Inception', '2010')
    """
    name = raw_name
    for ext in VIDEO_EXTENSIONS:
        if name.lower().endswith(ext):
            name = name[:-len(ext)]
            break

    # Replace dots, underscores, plus with spaces
    name = re.sub(r'[\._\+]', ' ', name)

    # Extract 4-digit year (1920-2099)
    year = None
    year_match = re.search(r'\b(19\d{2}|20\d{2})\b', name)
    if year_match:
        year = year_match.group(1)
        year_idx = year_match.start()
        name = name[:year_idx]

    # Remove quality, codecs, resolutions, release groups and languages
    junk_patterns = [
        r'\b(480p|720p|1080p|2160p|4k|uhd|fhd|hd|sd|cam|hdrip|web-dl|webrip|bluray|brrip|dvdrip|hdtv)\b',
        r'\b(x264|x265|hevc|h264|h265|10bit|8bit|aac|ac3|dts|ddp5\.1|atmos|mp3)\b',
        r'\b(hindi|english|dual audio|multi audio|sub|esub|dubbed|proper|hq|extended|uncut)\b',
        r'\[.*?\]', r'\(.*?\)',
        r'\b(s\d{1,2}e\d{1,2}|s\d{1,2}|season\s*\d+|episode\s*\d+)\b',
    ]

    for pattern in junk_patterns:
        name = re.sub(pattern, ' ', name, flags=re.IGNORECASE)

    # Clean whitespace and trailing symbols
    name = re.sub(r'[^a-zA-Z0-9\s\'-]', ' ', name)
    name = ' '.join(name.split()).strip()

    return name, year

def _urllib_get_json(url: str, headers: dict = None) -> Optional[dict]:
    """Helper for synchronous HTTP GET using urllib"""
    try:
        req = urllib.request.Request(url, headers=headers or {"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        logger.warning(f"urllib request failed for {url}: {e}")
    return None

async def fetch_omdb_details(title: str, year: Optional[str] = None, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetches full movie metadata from OMDb API using API Key"""
    if not api_key:
        return None

    url = f"https://www.omdbapi.com/?apikey={api_key}&t={urllib.parse.quote(title)}"
    if year:
        url += f"&y={year}"

    try:
        if aiohttp:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get("Response") == "True":
                            return data
                        elif year:
                            # Retry without year
                            url_no_year = f"https://www.omdbapi.com/?apikey={api_key}&t={urllib.parse.quote(title)}"
                            async with session.get(url_no_year, timeout=aiohttp.ClientTimeout(total=8)) as retry_resp:
                                if retry_resp.status == 200:
                                    retry_data = await retry_resp.json()
                                    if retry_data.get("Response") == "True":
                                        return retry_data
        else:
            data = await asyncio.to_thread(_urllib_get_json, url)
            if data and data.get("Response") == "True":
                return data
            elif year:
                url_no_year = f"https://www.omdbapi.com/?apikey={api_key}&t={urllib.parse.quote(title)}"
                retry_data = await asyncio.to_thread(_urllib_get_json, url_no_year)
                if retry_data and retry_data.get("Response") == "True":
                    return retry_data
    except Exception as e:
        logger.error(f"Error fetching from OMDb: {e}")
    return None

async def fetch_imdb_public_suggestion(title: str) -> Optional[Dict[str, Any]]:
    """
    Fallback: Uses IMDb's official public suggestion API (no API key needed!)
    Returns basic title, year, actors, and official IMDb poster.
    """
    try:
        clean_q = re.sub(r'[^a-zA-Z0-9]', '_', title.lower().strip())
        if not clean_q:
            return None
        url = f"https://v3.sg.media-imdb.com/suggestion/x/{clean_q}.json"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }

        if aiohttp:
            async with aiohttp.ClientSession(headers=headers) as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=6)) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = data.get("d", [])
                        if results:
                            item = results[0]
                            poster_url = item.get("i", {}).get("imageUrl") if isinstance(item.get("i"), dict) else None
                            return {
                                "Title": item.get("l", title),
                                "Year": str(item.get("y", "")),
                                "Actors": item.get("s", "N/A"),
                                "imdbID": item.get("id", ""),
                                "Poster": poster_url if poster_url else "N/A",
                                "Type": item.get("qid", "movie"),
                                "fallback": True
                            }
        else:
            data = await asyncio.to_thread(_urllib_get_json, url, headers)
            if data:
                results = data.get("d", [])
                if results:
                    item = results[0]
                    poster_url = item.get("i", {}).get("imageUrl") if isinstance(item.get("i"), dict) else None
                    return {
                        "Title": item.get("l", title),
                        "Year": str(item.get("y", "")),
                        "Actors": item.get("s", "N/A"),
                        "imdbID": item.get("id", ""),
                        "Poster": poster_url if poster_url else "N/A",
                        "Type": item.get("qid", "movie"),
                        "fallback": True
                    }
    except Exception as e:
        logger.warning(f"IMDb public suggestion fallback failed: {e}")
    return None

async def get_imdb_info(file_name: str) -> Optional[Dict[str, Any]]:
    """
    Main function to get IMDb information for a given filename.
    1. Checks if it's a video file or movie title.
    2. Cleans filename to get (title, year).
    3. Fetches details via OMDb if API key is provided in config.
    4. Falls back to public IMDb suggestion if no key or OMDb fails.
    """
    clean_title, year = clean_movie_title(file_name)
    if not clean_title or len(clean_title) < 2:
        return None

    api_key = getattr(config, "IMDB_API_KEY", "") or getattr(config, "OMDB_API_KEY", "")
    
    data = None
    if api_key:
        data = await fetch_omdb_details(clean_title, year, api_key)

    if not data:
        data = await fetch_imdb_public_suggestion(clean_title)

    if not data:
        return None

    poster = data.get("Poster")
    if poster in ("N/A", None, ""):
        poster = None

    imdb_id = data.get("imdbID")
    imdb_url = f"https://www.imdb.com/title/{imdb_id}/" if imdb_id else None

    return {
        "title": data.get("Title", clean_title),
        "year": data.get("Year", year or "N/A"),
        "rating": data.get("imdbRating", "N/A"),
        "genre": data.get("Genre", "N/A"),
        "runtime": data.get("Runtime", "N/A"),
        "language": data.get("Language", "N/A"),
        "director": data.get("Director", "N/A"),
        "actors": data.get("Actors", "N/A"),
        "plot": data.get("Plot", "N/A"),
        "poster": poster,
        "imdb_id": imdb_id,
        "imdb_url": imdb_url,
        "is_fallback": data.get("fallback", False),
    }

def format_imdb_caption(imdb_info: Dict[str, Any], file_name: str, file_size_str: str, 
                        download_url: str = "", stream_url: str = "", folder_name: str = "") -> str:
    """Formats a beautiful Telegram caption with IMDb and file details."""
    title = imdb_info.get("title")
    year = imdb_info.get("year", "")
    year_str = f" ({year})" if year and year != "N/A" else ""
    rating = imdb_info.get("rating", "N/A")
    genre = imdb_info.get("genre", "N/A")
    runtime = imdb_info.get("runtime", "N/A")
    actors = imdb_info.get("actors", "N/A")
    plot = imdb_info.get("plot", "N/A")
    director = imdb_info.get("director", "N/A")
    language = imdb_info.get("language", "N/A")

    lines = [
        f"🎬 **{title}{year_str}**",
        "━━━━━━━━━━━━━━━━━━━━━━",
    ]

    if rating != "N/A":
        lines.append(f"⭐ **IMDb Rating:** `{rating}/10`")
    if genre != "N/A":
        lines.append(f"🎭 **Genre:** `{genre}`")
    if runtime != "N/A":
        lines.append(f"⏳ **Runtime:** `{runtime}`")
    if language != "N/A":
        lines.append(f"🗣 **Language:** `{language}`")
    if director != "N/A":
        lines.append(f"🎬 **Director:** `{director}`")
    if actors != "N/A":
        lines.append(f"🌟 **Cast:** `{actors[:60]}`")

    if plot != "N/A" and len(plot) > 10:
        short_plot = (plot[:137] + "...") if len(plot) > 140 else plot
        lines.append(f"\n📖 **Plot:** _{short_plot}_")

    lines.append("\n📁 **File Details:**")
    lines.append(f"📄 **Name:** `{file_name}`")
    lines.append(f"💾 **Size:** `{file_size_str}`")
    if folder_name:
        lines.append(f"📂 **Folder:** `{folder_name}`")

    if download_url:
        lines.append(f"\n⚡ **Direct Download Link:**\n`{download_url}`")
    if stream_url:
        lines.append(f"\n🎬 **Online Stream Link:**\n`{stream_url}`")

    return "\n".join(lines)
