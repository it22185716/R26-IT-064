"""
Read-only check: for every unique video_url in videos.csv, asks YouTube's
oEmbed endpoint whether the video allows embedding, then prints a report
grouped by weak_area. Does not modify videos.csv or anything else.

    https://www.youtube.com/oembed?url={video_url}&format=json

A 200 response means the uploader allows embedding; a 401/403/404 (or any
other error) means it does not.
"""
import csv
import os
import urllib.error
import urllib.parse
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "videos.csv")
OEMBED_URL = "https://www.youtube.com/oembed"


def pick_column(fieldnames, *candidates):
    for name in candidates:
        if name in fieldnames:
            return name
    raise KeyError(f"None of {candidates} found in columns {fieldnames}")


def check_embeddable(video_url: str) -> tuple[bool, str]:
    query = urllib.parse.urlencode({"url": video_url, "format": "json"})
    request_url = f"{OEMBED_URL}?{query}"
    try:
        with urllib.request.urlopen(request_url, timeout=10) as resp:
            if resp.status == 200:
                return True, "200 OK"
            return False, f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code} {e.reason}"
    except urllib.error.URLError as e:
        return False, f"Request failed: {e.reason}"
    except Exception as e:  # noqa: BLE001 - report any failure as not embeddable
        return False, f"Error: {e}"


def main():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []

    title_col = pick_column(fieldnames, "video_title", "title")
    url_col = pick_column(fieldnames, "video_url", "url")
    weak_area_col = pick_column(fieldnames, "weak_area")

    print(f"Loaded {len(rows)} rows from {CSV_PATH}")
    print(f"Columns used: weak_area='{weak_area_col}', title='{title_col}', url='{url_col}'\n")

    # Check each unique video_url once.
    unique_urls = sorted({row[url_col] for row in rows})
    status_by_url: dict[str, tuple[bool, str]] = {}
    for url in unique_urls:
        status_by_url[url] = check_embeddable(url)

    embeddable_urls = sum(1 for ok, _ in status_by_url.values() if ok)
    print(f"Unique video_url count: {len(unique_urls)}")
    print(f"Embeddable: {embeddable_urls}  Not embeddable: {len(unique_urls) - embeddable_urls}\n")

    # Group rows by weak_area for the report.
    by_weak_area: dict[str, list[dict]] = {}
    for row in rows:
        by_weak_area.setdefault(row[weak_area_col], []).append(row)

    for weak_area in sorted(by_weak_area):
        print("=" * 100)
        print(f"WEAK AREA: {weak_area}")
        print("=" * 100)
        for row in by_weak_area[weak_area]:
            title = row[title_col]
            url = row[url_col]
            ok, detail = status_by_url[url]
            status = "EMBEDDABLE" if ok else "NOT embeddable"
            print(f"  [{status:14}] {title}")
            print(f"  {'':16} {url}  ({detail})")
        print()


if __name__ == "__main__":
    main()
