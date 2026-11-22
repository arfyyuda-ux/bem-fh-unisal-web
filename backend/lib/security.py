from urllib.parse import urlsplit


DEFAULT_CORS_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")


def parse_cors_origins(value: str | None) -> tuple[str, ...]:
    if not value or not value.strip():
        return DEFAULT_CORS_ORIGINS
    origins = tuple(origin.strip().rstrip("/") for origin in value.split(",") if origin.strip())
    if "*" in origins:
        return DEFAULT_CORS_ORIGINS
    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path or parsed.query or parsed.fragment:
            raise ValueError(f"Invalid CORS origin: {origin}")
    return origins or DEFAULT_CORS_ORIGINS


def origin_is_allowed(origin: str, origins: tuple[str, ...]) -> bool:
    return origin.rstrip("/") in origins


def request_origin_is_allowed(
    origin: str | None,
    fetch_site: str | None,
    origins: tuple[str, ...],
) -> bool:
    if not origin or origin_is_allowed(origin, origins):
        return True
    return fetch_site == "same-origin"
