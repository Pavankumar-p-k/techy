-- Seed data for Student Tool Hub
-- Run after schema.sql

insert into public.tools (
  slug,
  name,
  url,
  category,
  short_description,
  how_it_works,
  free_type,
  free_details,
  tags,
  status,
  is_verified
)
values
  (
    'chatgpt',
    'ChatGPT',
    'https://chatgpt.com',
    'Coding',
    'General AI assistant for coding, writing, and idea generation.',
    'Ask questions in natural language, iterate with follow-up prompts, and copy outputs into your projects.',
    'freemium',
    'Free tier available with usage limits and model restrictions.',
    array['coding', 'writing', 'assistant'],
    'published',
    true
  ),
  (
    'claude',
    'Claude',
    'https://claude.ai',
    'Writing',
    'Great for long-form writing, editing, and analysis.',
    'Upload or paste text and ask for rewrites, summaries, outlines, and code explanations.',
    'freemium',
    'Free plan with limited daily usage.',
    array['writing', 'analysis', 'assistant'],
    'published',
    true
  ),
  (
    'gemini',
    'Gemini',
    'https://gemini.google.com',
    'Research',
    'Google AI assistant for study help, search synthesis, and coding support.',
    'Use prompts with files and links to summarize topics and generate study material.',
    'freemium',
    'Free plan available with feature and quota limits.',
    array['research', 'coding', 'study'],
    'published',
    true
  ),
  (
    'github-copilot',
    'GitHub Copilot',
    'https://github.com/features/copilot',
    'Coding',
    'AI pair programmer inside your IDE for code completions and chat.',
    'Install extension in VS Code and use inline suggestions + chat for coding tasks.',
    'student_plan',
    'Free plan options exist, including student benefits in supported programs.',
    array['coding', 'ide', 'productivity'],
    'published',
    true
  ),
  (
    'cursor',
    'Cursor',
    'https://cursor.com',
    'Coding',
    'AI-first code editor with agent workflows and codebase chat.',
    'Open project folders, ask for edits, and apply changes directly from chat.',
    'freemium',
    'Hobby/free tier with usage limits.',
    array['coding', 'editor', 'agent'],
    'published',
    true
  ),
  (
    'windsurf',
    'Windsurf',
    'https://windsurf.com',
    'Coding',
    'AI code editor focused on fast development loops.',
    'Use AI tab completion and prompt-based edits while coding.',
    'freemium',
    'Free usage credits plus limited advanced features.',
    array['coding', 'editor', 'autocomplete'],
    'published',
    true
  ),
  (
    'hugging-face',
    'Hugging Face',
    'https://huggingface.co',
    'Learning',
    'Model hub and demos for experimenting with open-source AI.',
    'Browse models, run examples, and test APIs for projects and learning.',
    'free_forever',
    'Free account with usage limits on hosted inference services.',
    array['open-source', 'models', 'learning'],
    'published',
    true
  ),
  (
    'perplexity',
    'Perplexity',
    'https://www.perplexity.ai',
    'Research',
    'Answer engine with citations for quick topic research.',
    'Ask focused questions and verify claims via source links.',
    'freemium',
    'Free standard plan with daily limits on advanced usage.',
    array['research', 'search', 'citations'],
    'published',
    true
  ),
  (
    'grammarly',
    'Grammarly',
    'https://www.grammarly.com',
    'Writing',
    'Writing assistant for grammar, tone, and clarity improvements.',
    'Install extension or app and review sentence-level suggestions in real time.',
    'freemium',
    'Free plan includes core writing checks.',
    array['writing', 'editing', 'grammar'],
    'published',
    true
  ),
  (
    'figma',
    'Figma',
    'https://www.figma.com',
    'Design',
    'Collaborative interface design and prototyping platform.',
    'Create design files, build components, and share interactive prototypes.',
    'freemium',
    'Starter plan supports free collaborative design usage with limits.',
    array['design', 'ui', 'prototype'],
    'published',
    true
  )
on conflict (slug) do nothing;

insert into public.platform_resources (
  name,
  url,
  category,
  short_description,
  free_details
)
values
  (
    'freeCodeCamp',
    'https://www.freecodecamp.org',
    'Courses',
    'Hands-on coding curriculum and certifications.',
    'Fully free learning tracks.'
  ),
  (
    'MDN Web Docs',
    'https://developer.mozilla.org',
    'Documentation',
    'Trusted web development docs and references.',
    'Free access to all docs.'
  ),
  (
    'Roadmap.sh',
    'https://roadmap.sh',
    'Career',
    'Role-based learning roadmaps for developer growth.',
    'Free roadmap content.'
  ),
  (
    'Canva',
    'https://www.canva.com',
    'Design',
    'Quick designs for presentations, resumes, and posters.',
    'Free plan with templates and assets.'
  ),
  (
    'Overleaf',
    'https://www.overleaf.com',
    'Practice',
    'Online LaTeX editor for reports and research writing.',
    'Free collaborative plan available.'
  ),
  (
    'GeeksforGeeks Practice',
    'https://www.geeksforgeeks.org/practice',
    'Practice',
    'Programming practice problems and interview prep content.',
    'Free practice set available.'
  )
on conflict do nothing;
