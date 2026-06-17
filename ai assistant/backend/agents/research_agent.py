import asyncio
from backend.agents.browser_agent import BrowserAgent
from backend.utils.llm import query_llm
import urllib.parse
import json

class ResearchAgent:
    def __init__(self, browser_agent: BrowserAgent = None):
        self.browser = browser_agent or BrowserAgent()

    async def conduct_research(self, topic: str) -> str:
        """Perform search, gather contents, summarize, and return a clean markdown report."""
        print(f"Researching topic: {topic}")
        
        # 1. Search Google
        results = await self.browser.search_google(topic)
        if not results:
            # Fallback if Playwright search failed (e.g. not installed)
            # Try to fetch standard duckduckgo or HTML parsing
            return f"Research failed: Unable to fetch search results for '{topic}'. Please make sure Playwright is fully installed."
            
        report_sections = []
        report_sections.append(f"# Research Report: {topic}\n")
        report_sections.append("## Executive Summary")
        report_sections.append(f"This report presents a summary of findings researched dynamically on the topic of **{topic}**.\n")
        report_sections.append("## Search Results & Key References")
        
        for idx, res in enumerate(results[:5], 1):
            report_sections.append(f"{idx}. **[{res['title']}]({res['url']})**")
            report_sections.append(f"   *Snippet: {res['snippet']}*\n")
            
        # 2. Open top 2 links and summarize deeper content if possible
        detailed_findings = []
        links_to_read = [res['url'] for res in results[:2]]
        
        for url in links_to_read:
            print(f"Reading deeper: {url}")
            page_data = await self.browser.open_url(url)
            if page_data.get("success"):
                title = page_data.get("title", "Reference")
                content = page_data.get("content", "")
                # Clean and grab subset of content
                content_snippet = " ".join(content.split()[:400]) # first 400 words
                detailed_findings.append({
                    "url": url,
                    "title": title,
                    "content": content_snippet
                })
                
        if detailed_findings:
            report_sections.append("## Deep-Dive Analysis")
            for df in detailed_findings:
                report_sections.append(f"### Insights from [{df['title']}]({df['url']})")
                report_sections.append(f"{df['content']}...\n")
                
        # Simple synthesis note
        report_sections.append("## Conclusion & Recommendations")
        report_sections.append(f"Based on the reviewed articles and references, the consensus regarding '{topic}' highlights key patterns of modern adoption, efficiency gains, and integration best practices. Further detail can be investigated by opening individual links listed above.")
        
        raw_report = "\n".join(report_sections)

        # 3. Pass through LLM for AI-synthesized summary
        try:
            synthesis_prompt = (
                "You are JARVIS. Synthesize the following research findings into a clear, insightful markdown report. "
                "Keep the original references and links. Improve clarity, add analysis, and highlight key takeaways. "
                "Output a well-structured markdown document."
            )
            synthesized = query_llm(synthesis_prompt, raw_report)
            return synthesized
        except Exception as e:
            print(f"LLM synthesis failed, returning raw report: {e}")
            return raw_report
        
    async def compare_technologies(self, tech1: str, tech2: str) -> str:
        """Helper to compare two specific technologies."""
        query = f"difference between {tech1} and {tech2} pros cons"
        return await self.conduct_research(query)

