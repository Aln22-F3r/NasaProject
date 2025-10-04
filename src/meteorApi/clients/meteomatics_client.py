import httpx

class MeteomaticsClient:
    def __init__(self, client: httpx.AsyncClient):
        self._c = client

    async def get_raw(self, path: str) -> httpx.Response:
        return await self._c.get(path)
