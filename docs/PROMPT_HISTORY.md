# PROMPT HISTORY

Due to token limitations I followed the following procdure.
1. Generate a high level idea and plan using copilot web browser. This plan includes overall system architecture and MVP definition. like how many services what will be the responsisbility of each service and the overall application flow ; choosing most feasible option ; keeping in mind time constraints.
2. Generate a low level plan for each service and also the common package. Defining what apis data models tools functinoalities etc. This contained the actual implementation details for each service individually. This plan would be used to generate code in bulk via copilot web browser. 
3. Generating codebase zip using copilot web browser. Bulk of code generation done in this step.
3. Giving final touch and debugging related code changes done via Claude. 


## Note 
- Please open the prompt files in MS Word
- Small part of high level plan generation is missing


## HLD

First the high level design was generated. It covered the following points -
1. The MVP scope and idea based on time constraints and feasiblity.
2. How many services, data models and apis needed.
3. High level functionality determined on basis of high level user journey.

The HLD was generated across multiple conversations below being the final conversations. The resulting plan was reviewed and changes made before moving to LLD generation. 

The conversations are [Cloudfare-HLD-1](/docs/prompts/Cloudfare-HLD-1.mhtml) [Cloudfare-HLD-2](/docs/prompts/Cloudfare-HLD-2.mhtml) [Cloudfare-HLD-3](/docs/prompts/Cloudfare-HLD-3.mhtml). 

## Agents md 

AGENTS.md file was generated in [Cloudfare-Agent-md](/docs/prompts/Cloudfare-Agent-md.mhtml) using a sample and the hld plan generated before.

## LLD

The HLD was used to generate a less detailed LLD for each of the services in [Cloudfare-LLD-A](/docs/prompts/Cloudfare-LLD-A.mhtml) using the hld and agents md file.

In subsequent conversations detailed LLDs were generated for each of the services using the less detailed service specific plan files and decisions.md file (decisions md was later on appended to hld itself).
Following are the conversations
[Cloudfare-LLD-B](/docs/prompts/Cloudfare-LLD-B.mhtml) 
[Cloudfare-LLD-C](/docs/prompts/Cloudfare-LLD-C.mhtml) 
[Cloudfare-LLD-D](/docs/prompts/Cloudfare-LLD-D.mhtml) 
[Cloudfare-LLD-E](/docs/prompts/Cloudfare-LLD-E.mhtml) 
[Cloudfare-LLD-F](/docs/prompts/Cloudfare-LLD-F.mhtml) 
[Cloudfare-LLD-G](/docs/prompts/Cloudfare-LLD-G.mhtml) 

## Code Generation

Bulk of the code was generated using a dump of all the detailed plan files previously generated. Each conversation was used to generate code of 1 service only. The first conversation was to generate root level code. Check
[Cloudfare-Code-1](/docs/prompts/Cloudfare-Code-1.mhtml)
[Cloudfare-Code-2](/docs/prompts/Cloudfare-Code-2.mhtml)
[Cloudfare-Code-3](/docs/prompts/Cloudfare-Code-3.mhtml)
[Cloudfare-Code-4](/docs/prompts/Cloudfare-Code-4.mhtml)
[Cloudfare-Code-5](/docs/prompts/Cloudfare-Code-5.mhtml)
[Cloudfare-Code-6](/docs/prompts/Cloudfare-Code-6.mhtml)
[Cloudfare-Code-7](/docs/prompts/Cloudfare-Code-7.mhtml) 

## Others

Deployment and setup related conversation history is in [Cloudfare-deploy](/docs/prompts/Cloudfare-deploy.mhtml)

Initial Debugging prompt history in [Cloudfare-debug](/docs/prompts/Cloudfare-debug.mhtml)

Final code changes and debugging done via Claude [Cloudfare-Claude-History](/docs/prompts/Cloudfare-Claude-History.md)
