from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import requests


def validate_public_http_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Enter a valid public http or https URL.")
    hostname = parsed.hostname.lower().rstrip(".")
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("Local and private URLs are not allowed.")
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(hostname, parsed.port or 443, type=socket.SOCK_STREAM)}
    except socket.gaierror as exc:
        raise ValueError("The URL hostname could not be resolved.") from exc
    if not addresses or any(not _is_public_address(address) for address in addresses):
        raise ValueError("Local and private URLs are not allowed.")
    return url


def safe_get_public_url(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    timeout: int = 20,
    max_redirects: int = 5,
) -> requests.Response:
    current = validate_public_http_url(url)
    for _ in range(max_redirects + 1):
        response = requests.get(current, headers=headers, timeout=timeout, allow_redirects=False)
        if response.is_redirect or response.is_permanent_redirect:
            location = response.headers.get("location")
            if not location:
                response.raise_for_status()
            current = validate_public_http_url(urljoin(current, location))
            continue
        response.raise_for_status()
        return response
    raise ValueError("The URL redirected too many times.")


def _is_public_address(value: str) -> bool:
    address = ipaddress.ip_address(value)
    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )
