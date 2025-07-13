from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
import weave

from guide_creator_flow.tools.custom_tool import ExaSearchTool

# If you want to run a snippet of code before or after the crew starts,
# you can use the @before_kickoff and @after_kickoff decorators
# https://docs.crewai.com/concepts/crews#example-crew-class-with-decorators


@CrewBase
class SearchCrew:
    """Web Search Research Crew"""

    agents: List[BaseAgent]
    tasks: List[Task]

    # Learn more about YAML configuration files here:
    # Agents: https://docs.crewai.com/concepts/agents#yaml-configuration-recommended
    # Tasks: https://docs.crewai.com/concepts/tasks#yaml-configuration-recommended
    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    # If you would lik to add tools to your crew, you can learn more about it here:
    # https://docs.crewai.com/concepts/agents#agent-tools
    @agent
    def search_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["search_researcher"],  # type: ignore[index]
            tools=[ExaSearchTool()],
            verbose=True
        )

    @agent  
    def summarizer(self) -> Agent:
        return Agent(
            config=self.agents_config["summarizer"],  # type: ignore[index]
            verbose=True
        )

    # To learn more about structured task outputs,
    # task dependencies, and task callbacks, check out the documentation:
    # https://docs.crewai.com/concepts/tasks#overview-of-a-task
    @task
    def web_search_task(self) -> Task:
        return Task(
            config=self.tasks_config["web_search_task"],  # type: ignore[index]
        )

    @task
    def create_summary(self) -> Task:
        return Task(
            config=self.tasks_config["create_summary"],  # type: ignore[index]
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Research Crew"""
        # To learn how to add knowledge sources to your crew, check out the documentation:
        # https://docs.crewai.com/concepts/knowledge#what-is-knowledge

        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            process=Process.sequential,
            verbose=True,
        )
    
    @weave.op()
    def execute_search(self, query: str):
        """Execute the search crew with Weave tracing."""
        return self.crew().kickoff(inputs={"query": query})
