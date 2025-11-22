# System Prompts for HIKEathon 2025 GPTs

This directory contains the system prompts for all custom GPTs used in the HIKEathon 2025 application.

## Structure

```
prompts/
└── gpts/
    ├── general.md              # General purpose assistant
    ├── coding.md               # Programming assistant
    ├── creative.md             # Creative brainstorming
    ├── research.md             # Research and data analysis
    ├── interview.md            # User interview conductor
    ├── bmc.md                  # Business Model Canvas expert
    ├── reframer.md             # Challenge reframing specialist
    ├── ideation.md             # Creative ideation facilitator
    └── problem-explorer.md     # Design-Thinking Phase 1 coach (German)
```

## How They Work

Prompts are automatically loaded at runtime from these markdown files using Vite's `import.meta.glob()` feature. This allows:

- **Better maintainability**: Each prompt in its own file
- **Easier editing**: Use any text editor without inline escaping
- **Version control**: Clear diffs for prompt changes
- **Modular structure**: Easy to add/remove GPTs

## Adding a New Prompt

1. Create a new markdown file in `gpts/` (e.g., `my-gpt.md`)
2. Write your system prompt content
3. The prompt will be automatically loaded and available as a GPT in the application

The key is derived from the filename (without `.md` extension).

## Key Prompts

### problem-explorer.md
A comprehensive German-language system prompt (~270 lines) that guides teams through Design-Thinking Phase 1:
- Stakeholder analysis
- Semantic analysis of design challenges
- Design charette exploration
- Best practices and boundaries

All other prompts are concise single-sentence or single-paragraph instructions.
