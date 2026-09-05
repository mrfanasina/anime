"""
Helpers HTTP robustes pour les appels aux APIs externes (AniList, Jikan, ...).

- Ajoute un User-Agent explicite : AniList/Cloudflare bloquent souvent le
  User-Agent par défaut de python-requests (403 Forbidden).
- Relance automatiquement les erreurs transitoires (429, 502, 503, 504,
  timeout, erreurs de connexion) avec backoff exponentiel.
"""
import logging
import time

import requests

DEFAULT_HEADERS = {
    "User-Agent": "AnimeManager/1.0 (metadata-sync)",
    "Accept": "application/json",
}

RETRYABLE_STATUS = (429, 502, 503, 504)
MAX_RETRY_WAIT = 30  # secondes, plafond pour Retry-After / backoff


def request_with_retry(
    method: str,
    url: str,
    *,
    retries: int = 3,
    backoff: float = 2.0,
    timeout: float = 10,
    **kwargs,
) -> requests.Response:
    """Effectue une requête HTTP avec User-Agent par défaut et retries.

    Retourne la réponse si le statut est 2xx, lève une exception
    `requests.HTTPError` pour les 4xx non retryables, et une
    `requests.RequestException` si tous les retries échouent.
    """
    headers = dict(DEFAULT_HEADERS)
    headers.update(kwargs.pop("headers", None) or {})
    kwargs["headers"] = headers
    kwargs["timeout"] = timeout

    for attempt in range(retries):
        try:
            resp = requests.request(method, url, **kwargs)

            if resp.status_code in RETRYABLE_STATUS:
                retry_after = resp.headers.get("Retry-After")
                wait = float(retry_after) if retry_after else backoff * (2 ** attempt)
                wait = min(wait, MAX_RETRY_WAIT)
                logging.warning(
                    f"[HTTP] {method} {url} -> {resp.status_code}, "
                    f"nouvel essai dans {wait:.0f}s (essai {attempt + 1}/{retries})"
                )
                time.sleep(wait)
                continue

            resp.raise_for_status()
            return resp

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt == retries - 1:
                raise
            wait = min(backoff * (2 ** attempt), MAX_RETRY_WAIT)
            logging.warning(
                f"[HTTP] {method} {url} -> {e.__class__.__name__}, "
                f"nouvel essai dans {wait:.0f}s (essai {attempt + 1}/{retries})"
            )
            time.sleep(wait)

        except requests.exceptions.HTTPError:
            raise

    raise requests.exceptions.RequestException(
        f"Nombre maximal de tentatives atteint pour {method} {url}"
    )