"""
JavaScript Generation Crew

This crew generates JavaScript code for website overlays and modifications
based on user descriptions using CrewAI and OpenAI models.
"""
import os
from pathlib import Path
from crewai import Agent, Crew, Task
from crewai.project import CrewBase, agent, crew, task
import yaml


@CrewBase
class ScriptCrew():
    """Script generation crew for creating JavaScript code"""
    
    def __init__(self):
        """Initialize the crew with proper paths"""
        self.crew_dir = Path(__file__).parent
        self.agents_config = self._load_config('agents.yaml')
        self.tasks_config = self._load_config('tasks.yaml')
    
    def _load_config(self, filename):
        """Load configuration from yaml file"""
        config_path = self.crew_dir / 'config' / filename
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    @agent
    def javascript_developer(self) -> Agent:
        """Create the JavaScript developer agent"""
        config = self.agents_config['javascript_developer']
        return Agent(
            role=config['role'],
            goal=config['goal'],
            backstory=config['backstory'],
            verbose=True,
            allow_delegation=False,
            max_iter=1  # Single shot generation
        )
    
    @task
    def generate_javascript_task(self) -> Task:
        """Create the JavaScript generation task"""
        config = self.tasks_config['generate_javascript']
        return Task(
            description=config['description'],
            expected_output=config['expected_output'],
            agent=self.javascript_developer()
        )
    
    @crew
    def crew(self) -> Crew:
        """Creates the Script crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process='sequential',
            verbose=True,  # Changed from 2 to True
        )
    
    def generate_script(self, description: str) -> str:
        """
        Generate JavaScript code based on the description.
        
        Args:
            description: What the user wants to create
            
        Returns:
            Generated JavaScript code as a string
        """
        try:
            # Create a crew instance with the input
            crew_instance = self.crew()
            
            # Run the crew with the description
            result = crew_instance.kickoff(inputs={'description': description})
            
            # Extract the raw JavaScript code from the result
            if hasattr(result, 'raw'):
                js_code = result.raw
            elif hasattr(result, 'output'):
                js_code = result.output
            elif isinstance(result, str):
                js_code = result
            else:
                js_code = str(result)
            
            # Clean up any markdown formatting
            js_code = js_code.strip()
            if '```javascript' in js_code:
                # Extract code between markdown blocks
                start = js_code.find('```javascript') + 13
                end = js_code.find('```', start)
                if end > start:
                    js_code = js_code[start:end].strip()
            elif '```' in js_code:
                # Extract code between generic markdown blocks
                start = js_code.find('```') + 3
                end = js_code.find('```', start)
                if end > start:
                    js_code = js_code[start:end].strip()
            
            return js_code
            
        except Exception as e:
            # Return error as JavaScript comment with more details
            import traceback
            error_details = traceback.format_exc()
            print(f"CrewAI Error: {error_details}")  # Log for debugging
            return f"// Error generating JavaScript: {str(e)}" 