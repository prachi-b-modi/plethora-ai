# Vibrowse Repository Analysis Notes

## Project Overview
- **Name**: Vibrowse
- **Framework**: CrewAI-based multi-agent AI system
- **LLM**: Claude Sonnet 4 (configured with ANTHROPIC_API_KEY)
- **Purpose**: Research and reporting automation using AI agents

## Current Architecture

### Agents (2 total)
1. **Researcher**
   - Role: {topic} Senior Data Researcher
   - Goal: Uncover cutting-edge developments in {topic}
   - Specialization: Finding relevant information and presenting it clearly

2. **Reporting Analyst** 
   - Role: {topic} Reporting Analyst
   - Goal: Create detailed reports based on research findings
   - Specialization: Converting complex data into clear, actionable reports

### Tasks (2 total)
1. **Research Task**
   - Assigned to: Researcher agent
   - Input: Topic + current year
   - Output: 10 bullet points of most relevant information

2. **Reporting Task**
   - Assigned to: Reporting analyst
   - Input: Research context from previous task
   - Output: Full markdown report with detailed sections
   - File output: `report.md`

### Current Configuration
- **Default Topic**: "AI LLMs"
- **Process**: Sequential (researcher → reporting analyst)
- **Dependencies**: crewai[tools] >=0.141.0
- **Python**: >=3.10, <3.14

## Key Files Structure
```
src/vibrowse/
├── main.py          # Entry points (run, train, replay, test)
├── crew.py          # Crew orchestration and agent/task definitions
├── config/
│   ├── agents.yaml  # Agent role definitions
│   └── tasks.yaml   # Task descriptions and expected outputs
└── tools/
    └── custom_tool.py # Placeholder for custom tools

knowledge/
└── user_preference.txt # User context (John Doe, AI Engineer, SF)
```

## Current State Assessment
- **Status**: Template/starter project - not heavily customized yet
- **Functionality**: Basic research → report pipeline working
- **Customization Level**: Minimal - using default CrewAI patterns
- **Tool Integration**: Placeholder custom tool, not implemented

## Potential Improvements/Next Steps
1. **Custom Tools**: Implement actual custom tools for specific research capabilities
2. **Knowledge Integration**: Better utilize the knowledge directory for context
3. **Topic Parameterization**: Make topic selection more dynamic/interactive
4. **Agent Specialization**: Add more specialized agents for different research domains
5. **Output Formats**: Support multiple report formats beyond markdown
6. **User Personalization**: Leverage user preferences more effectively

## Questions for Development
- What specific research domains should this focus on?
- What custom tools would be most valuable?
- Should this be more interactive or batch-oriented?
- How should user preferences be incorporated into agent behavior? 