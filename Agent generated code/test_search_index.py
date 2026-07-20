from datetime import datetime, timezone
from search_index import AssetSearchIndex
from models import Asset, AssetSearchQuery


def make_asset(id, filename, tags=None):
    return Asset(id=id, project_id="p1", owner_id="u1", filename=filename,
                 mime_type="image/png", size_bytes=1000, storage_url="https://x",
                 tags=tags or [], created_at=datetime.now(timezone.utc))


def test_search_by_filename_token():
    idx = AssetSearchIndex()
    idx.add(make_asset("a1", "sunset_beach.png"))
    idx.add(make_asset("a2", "mountain_view.png"))
    results, ms = idx.search(AssetSearchQuery(project_id="p1", query="sunset"))
    assert len(results) == 1
    assert results[0].id == "a1"
    assert ms < 100


def test_search_by_tag():
    idx = AssetSearchIndex()
    idx.add(make_asset("a1", "x.png", tags=["hero", "landing"]))
    idx.add(make_asset("a2", "y.png", tags=["footer"]))
    results, _ = idx.search(AssetSearchQuery(project_id="p1", tags=["hero"]))
    assert len(results) == 1 and results[0].id == "a1"
