#!/usr/bin/env python
from pydantic import BaseModel

from crewai.flow import Flow, listen, start

from guide_creator_flow.crews.poem_crew.poem_crew import SearchCrew


class SearchState(BaseModel):
    query: str = ""
    search_results: str = ""
    final_summary: str = ""


class WebSearchFlow(Flow[SearchState]):

    @start()
    def get_search_query(self):
        """Get the search query from user input"""
        print("🔍 Web Search Assistant Ready!")
        print("=" * 50)
        
        # Get query from user
        query = input("Enter your search query: ").strip()
        
        if not query:
            query = "latest developments in artificial intelligence"
            print(f"Using default query: {query}")
        
        print(f"\n🔎 Searching for: '{query}'")
        print("⏳ Performing web search and analysis...")
        
        self.state.query = query

    @listen(get_search_query)
    def perform_web_search(self):
        """Execute the web search using the SearchCrew"""
        print("\n📡 Initiating web search crew...")
        
        result = SearchCrew().execute_search(self.state.query)

        print("✅ Search and analysis completed!")
        self.state.final_summary = result.raw

    @listen(perform_web_search)
    def save_and_display_results(self):
        """Save results and display the summary"""
        print("\n💾 Saving results...")
        
        # Save to file
        filename = f"search_results_{self.state.query.replace(' ', '_')[:30]}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"Search Query: {self.state.query}\n")
            f.write("=" * 50 + "\n\n")
            f.write(self.state.final_summary)
        
        print(f"📄 Results saved to: {filename}")
        
        # Display summary
        print("\n🎯 SEARCH SUMMARY:")
        print("=" * 50)
        print(self.state.final_summary)
        print("=" * 50)
        print("✨ Search completed successfully!")


def kickoff():
    """Start the web search flow"""
    search_flow = WebSearchFlow()
    search_flow.kickoff()


def plot():
    """Display the flow diagram"""
    search_flow = WebSearchFlow()
    search_flow.plot()


if __name__ == "__main__":
    kickoff()
