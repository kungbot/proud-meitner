import os
import asyncio
from playwright.async_api import async_playwright

class BrowserAgent:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None

    async def _ensure_browser(self):
        """Lazy loader for playwright browser."""
        if not self.browser:
            self.playwright = await async_playwright().start()
            try:
                self.browser = await self.playwright.chromium.launch(headless=True)
                self.context = await self.browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                self.page = await self.context.new_page()
            except Exception as e:
                # If playwright is not installed/configured, try installing it or fail gracefully
                print(f"Playwright launch failed. Make sure 'playwright install' was run. Error: {e}")
                raise e

    async def open_url(self, url: str) -> dict:
        """Navigate to a URL and return title and snippet."""
        try:
            await self._ensure_browser()
            response = await self.page.goto(url, wait_until="networkidle", timeout=15000)
            title = await self.page.title()
            # Extract plain text content
            text_content = await self.page.evaluate("() => document.body.innerText")
            # Limit snippet
            snippet = text_content[:10000] if text_content else ""
            
            return {
                "success": True,
                "url": url,
                "title": title,
                "status": response.status if response else 200,
                "content": snippet
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def search_google(self, query: str) -> list:
        """Search Google via Playwright and extract organic results."""
        try:
            await self._ensure_browser()
            url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
            await self.page.goto(url, wait_until="networkidle", timeout=15000)
            
            # Extract links and titles
            results = await self.page.evaluate("""
                () => {
                    const items = [];
                    const searchResults = document.querySelectorAll('div.g');
                    searchResults.forEach(el => {
                        const titleEl = el.querySelector('h3');
                        const linkEl = el.querySelector('a');
                        const snippetEl = el.querySelector('div.VwiC3d');
                        if (titleEl && linkEl) {
                            items.push({
                                title: titleEl.innerText,
                                url: linkEl.href,
                                snippet: snippetEl ? snippetEl.innerText : ''
                            });
                        }
                    });
                    return items;
                }
            """)
            return results[:7]  # return top 7 results
        except Exception as e:
            print(f"Error searching Google via Playwright: {e}")
            return []

    async def click_element(self, selector: str) -> bool:
        """Click on element on page."""
        try:
            if not self.page:
                return False
            await self.page.click(selector, timeout=5000)
            return True
        except Exception as e:
            print(f"Error clicking {selector}: {e}")
            return False

    async def fill_field(self, selector: str, text: str) -> bool:
        """Fill a text field."""
        try:
            if not self.page:
                return False
            await self.page.fill(selector, text, timeout=5000)
            return True
        except Exception as e:
            print(f"Error filling {selector}: {e}")
            return False

    async def get_screenshot(self, save_path: str) -> bool:
        """Take screenshot of current web page."""
        try:
            if not self.page:
                return False
            await self.page.screenshot(path=save_path)
            return True
        except Exception as e:
            print(f"Error capturing browser screenshot: {e}")
            return False

    async def close(self):
        """Close browser resources."""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.page = None
        self.context = None
        self.browser = None
        self.playwright = None
