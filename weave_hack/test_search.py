#!/usr/bin/env python
"""
Test script to demonstrate the Web Search Assistant functionality
"""

from src.guide_creator_flow.main import WebSearchFlow

def test_search():
    """Run a test search with a predefined query"""
    
    # Create the flow
    search_flow = WebSearchFlow()
    
    # Set a test query directly
    print("🔍 Web Search Assistant Test!")
    print("=" * 50)
    test_query = "latest developments in artificial intelligence 2024"
    print(f"Test Query: {test_query}")
    print("⏳ Starting search and analysis...")
    
    # Set the query in the state
    search_flow.state.query = test_query
    
    # Start from the search step (skip user input)
    try:
        print("\n📡 Initiating web search crew...")
        
        from src.guide_creator_flow.crews.poem_crew.poem_crew import SearchCrew
        
        result = (
            SearchCrew()
            .crew()
            .kickoff(inputs={"query": test_query})
        )

        print("✅ Search and analysis completed!")
        
        # Save and display results
        filename = f"search_results_{test_query.replace(' ', '_')[:30]}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"Search Query: {test_query}\n")
            f.write("=" * 50 + "\n\n")
            f.write(result.raw)
        
        print(f"📄 Results saved to: {filename}")
        
        # Display summary
        print("\n🎯 SEARCH SUMMARY:")
        print("=" * 50)
        print(result.raw)
        print("=" * 50)
        print("✨ Search completed successfully!")
        
        return result.raw
        
    except Exception as e:
        print(f"❌ Error during search: {str(e)}")
        return None

if __name__ == "__main__":
    test_search() 