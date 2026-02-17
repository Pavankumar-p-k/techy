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

with seeded_tools (slug, name, url, category, free_type) as (
  values
    ('chatgpt', 'ChatGPT (GPT-4o mini)', 'https://chatgpt.com', 'General AI', 'freemium'),
    ('google-gemini-3-flash', 'Google Gemini 3 Flash', 'https://gemini.google.com', 'General AI', 'freemium'),
    ('claude-sonnet', 'Claude Sonnet', 'https://claude.ai', 'General AI', 'freemium'),
    ('microsoft-copilot', 'Microsoft Copilot', 'https://copilot.microsoft.com', 'General AI', 'freemium'),
    ('grok-4-1', 'Grok 4.1', 'https://x.com/i/grok', 'General AI', 'freemium'),
    ('perplexity-ai', 'Perplexity AI', 'https://www.perplexity.ai', 'Research', 'freemium'),
    ('consensus', 'Consensus', 'https://consensus.app', 'Research', 'freemium'),
    ('elicit', 'Elicit', 'https://elicit.org', 'Research', 'freemium'),
    ('semantic-scholar', 'Semantic Scholar', 'https://www.semanticscholar.org', 'Research', 'free_forever'),
    ('scispace', 'SciSpace', 'https://typeset.io', 'Research', 'freemium'),
    ('scholarcy', 'Scholarcy', 'https://www.scholarcy.com', 'Research', 'freemium'),
    ('researchrabbit', 'ResearchRabbit', 'https://www.researchrabbit.ai', 'Research', 'free_forever'),
    ('litmaps', 'Litmaps', 'https://www.litmaps.com', 'Research', 'freemium'),
    ('scite', 'Scite', 'https://scite.ai', 'Research', 'freemium'),
    ('bodhan-ai', 'Bodhan AI', 'https://bodhanai.org', 'Research', 'free_forever'),
    ('grammarly', 'Grammarly', 'https://www.grammarly.com', 'Writing', 'freemium'),
    ('quillbot', 'QuillBot', 'https://quillbot.com', 'Writing', 'freemium'),
    ('wordtune', 'Wordtune', 'https://www.wordtune.com', 'Writing', 'freemium'),
    ('hemingway-editor', 'Hemingway Editor', 'https://hemingwayapp.com', 'Writing', 'free_forever'),
    ('prowritingaid', 'ProWritingAid', 'https://prowritingaid.com', 'Writing', 'freemium'),
    ('languagetool', 'LanguageTool', 'https://languagetool.org', 'Writing', 'freemium'),
    ('writesonic', 'Writesonic', 'https://writesonic.com', 'Writing', 'freemium'),
    ('copy-ai', 'Copy.ai', 'https://www.copy.ai', 'Writing', 'freemium'),
    ('jasper', 'Jasper', 'https://www.jasper.ai', 'Writing', 'trial'),
    ('rytr', 'Rytr', 'https://rytr.me', 'Writing', 'freemium'),
    ('wolfram-alpha', 'Wolfram Alpha', 'https://www.wolframalpha.com', 'STEM', 'freemium'),
    ('photomath', 'Photomath', 'https://photomath.com', 'STEM', 'freemium'),
    ('socratic-google', 'Socratic (Google)', 'https://socratic.org', 'STEM', 'free_forever'),
    ('github-copilot', 'GitHub Copilot', 'https://github.com/features/copilot', 'STEM', 'student_plan'),
    ('cursor-ai', 'Cursor AI', 'https://cursor.com', 'STEM', 'freemium'),
    ('replit-ghostwriter', 'Replit Ghostwriter', 'https://replit.com', 'STEM', 'freemium'),
    ('symbolab', 'Symbolab', 'https://www.symbolab.com', 'STEM', 'freemium'),
    ('codeium', 'Codeium', 'https://codeium.com', 'STEM', 'free_forever'),
    ('julius-ai', 'Julius AI', 'https://julius.ai', 'STEM', 'freemium'),
    ('askcodi', 'AskCodi', 'https://www.askcodi.com', 'STEM', 'freemium'),
    ('notion-ai', 'Notion AI', 'https://www.notion.so', 'Productivity', 'freemium'),
    ('notebooklm', 'NotebookLM', 'https://notebooklm.google.com', 'Productivity', 'free_forever'),
    ('otter-ai', 'Otter.ai', 'https://otter.ai', 'Productivity', 'freemium'),
    ('fathom', 'Fathom', 'https://fathom.video', 'Productivity', 'free_forever'),
    ('obsidian-ai', 'Obsidian AI', 'https://obsidian.md', 'Productivity', 'freemium'),
    ('taskade', 'Taskade', 'https://www.taskade.com', 'Productivity', 'freemium'),
    ('evernote-ai', 'Evernote', 'https://evernote.com', 'Productivity', 'freemium'),
    ('motion', 'Motion', 'https://www.usemotion.com', 'Productivity', 'trial'),
    ('recall', 'Recall', 'https://www.getrecall.ai', 'Productivity', 'trial'),
    ('granola-ai', 'Granola AI', 'https://www.granola.so', 'Productivity', 'freemium'),
    ('canva-magic-studio', 'Canva Magic Studio', 'https://www.canva.com', 'Design', 'freemium'),
    ('gamma-ai', 'Gamma AI', 'https://gamma.app', 'Design', 'freemium'),
    ('beautiful-ai', 'Beautiful.ai', 'https://www.beautiful.ai', 'Design', 'trial'),
    ('adobe-firefly', 'Adobe Firefly', 'https://firefly.adobe.com', 'Design', 'freemium'),
    ('leonardo-ai', 'Leonardo.ai', 'https://leonardo.ai', 'Design', 'freemium'),
    ('tome', 'Tome', 'https://tome.app', 'Design', 'freemium'),
    ('slidesgo-ai', 'Slidesgo AI', 'https://slidesgo.com', 'Design', 'freemium'),
    ('midjourney', 'Midjourney', 'https://www.midjourney.com', 'Design', 'trial'),
    ('dalle-3', 'DALL-E 3', 'https://www.bing.com/images/create', 'Design', 'freemium'),
    ('visme', 'Visme', 'https://www.visme.co', 'Design', 'freemium'),
    ('capcut-ai', 'CapCut AI', 'https://www.capcut.com', 'Video & Audio', 'freemium'),
    ('descript', 'Descript', 'https://www.descript.com', 'Video & Audio', 'freemium'),
    ('synthesia', 'Synthesia', 'https://www.synthesia.io', 'Video & Audio', 'trial'),
    ('runway-gen-3', 'Runway (Gen-3)', 'https://runwayml.com', 'Video & Audio', 'trial'),
    ('elevenlabs', 'ElevenLabs', 'https://elevenlabs.io', 'Video & Audio', 'freemium'),
    ('speechify', 'Speechify', 'https://speechify.com', 'Video & Audio', 'freemium'),
    ('adobe-podcast', 'Adobe Podcast', 'https://podcast.adobe.com', 'Video & Audio', 'free_forever'),
    ('pika', 'Pika', 'https://pika.art', 'Video & Audio', 'freemium'),
    ('sora-2', 'Sora 2', 'https://openai.com/sora', 'Video & Audio', 'trial'),
    ('pictory', 'Pictory', 'https://pictory.ai', 'Video & Audio', 'trial'),
    ('duolingo-max', 'Duolingo Max', 'https://www.duolingo.com', 'Language Learning', 'freemium'),
    ('quizlet-q-chat', 'Quizlet Q-Chat', 'https://quizlet.com', 'Language Learning', 'freemium'),
    ('anki', 'Anki', 'https://apps.ankiweb.net', 'Language Learning', 'open_source'),
    ('mochi', 'Mochi', 'https://mochi.cards', 'Language Learning', 'freemium'),
    ('mondly', 'Mondly', 'https://www.mondly.com', 'Language Learning', 'freemium'),
    ('talkpal', 'TalkPal', 'https://talkpal.ai', 'Language Learning', 'freemium'),
    ('gliglish', 'Gliglish', 'https://gliglish.com', 'Language Learning', 'freemium'),
    ('rosetta-stone-ai', 'Rosetta Stone AI', 'https://www.rosettastone.com', 'Language Learning', 'trial'),
    ('remnote', 'RemNote', 'https://www.remnote.com', 'Language Learning', 'freemium'),
    ('brainscape', 'Brainscape', 'https://www.brainscape.com', 'Language Learning', 'freemium'),
    ('humata-ai', 'Humata AI', 'https://www.humata.ai', 'Specialized Utilities', 'freemium'),
    ('chatpdf', 'ChatPDF', 'https://www.chatpdf.com', 'Specialized Utilities', 'freemium'),
    ('documind', 'Documind', 'https://documind.chat', 'Specialized Utilities', 'freemium'),
    ('glasp', 'Glasp', 'https://glasp.co', 'Specialized Utilities', 'freemium'),
    ('eightify', 'Eightify', 'https://eightify.app', 'Specialized Utilities', 'freemium'),
    ('summarize-tech', 'Summarize.tech', 'https://summarize.tech', 'Specialized Utilities', 'free_forever'),
    ('explainpaper', 'ExplainPaper', 'https://www.explainpaper.com', 'Specialized Utilities', 'freemium'),
    ('wizdom-ai', 'Wizdom.ai', 'https://wizdom.ai', 'Specialized Utilities', 'freemium'),
    ('genei', 'Genei', 'https://genei.io', 'Specialized Utilities', 'freemium'),
    ('wiseone', 'Wiseone', 'https://wiseone.io', 'Specialized Utilities', 'freemium'),
    ('kickresume', 'Kickresume', 'https://www.kickresume.com', 'Career', 'freemium'),
    ('rezi', 'Rezi', 'https://www.rezi.ai', 'Career', 'freemium'),
    ('interviewing-io', 'Interviewing.io', 'https://interviewing.io', 'Career', 'freemium'),
    ('wonsulting-ai', 'Wonsulting AI', 'https://www.wonsulting.com', 'Career', 'freemium'),
    ('teal', 'Teal', 'https://www.tealhq.com', 'Career', 'freemium'),
    ('zapier', 'Zapier', 'https://zapier.com', 'Career', 'freemium'),
    ('make', 'Make', 'https://www.make.com', 'Career', 'freemium'),
    ('gumloop', 'Gumloop', 'https://www.gumloop.com', 'Career', 'freemium'),
    ('lindy-ai', 'Lindy.ai', 'https://www.lindy.ai', 'Career', 'trial'),
    ('mubert', 'Mubert', 'https://mubert.com', 'Career', 'freemium'),
    ('brain-fm', 'Brain.fm', 'https://www.brain.fm', 'Career', 'trial'),
    ('character-ai', 'Character.ai', 'https://character.ai', 'Career', 'freemium'),
    ('pi-ai', 'Pi.ai', 'https://pi.ai', 'Career', 'free_forever'),
    ('mindstudio', 'MindStudio', 'https://youai.ai', 'Career', 'freemium'),
    ('you-com', 'You.com', 'https://you.com', 'Career', 'freemium')
)
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
select
  slug,
  name,
  url,
  category,
  name || ' is an AI tool for student ' || lower(category) || ' workflows.',
  'Open the official site, sign in, and use focused prompts or workflows to complete study tasks faster.',
  free_type,
  case free_type
    when 'free_forever' then 'Free to use with core features available at no cost.'
    when 'student_plan' then 'Student plan available; verify eligibility where required.'
    when 'open_source' then 'Open-source access with free community usage.'
    when 'trial' then 'Limited trial credits available before paid usage.'
    else 'Freemium access with daily or monthly usage limits.'
  end,
  array[lower(replace(category, ' ', '_')), 'students', 'ai']::text[],
  'published',
  true
from seeded_tools
on conflict (slug) do update
set
  name = excluded.name,
  url = excluded.url,
  category = excluded.category,
  short_description = excluded.short_description,
  how_it_works = excluded.how_it_works,
  free_type = excluded.free_type,
  free_details = excluded.free_details,
  tags = excluded.tags,
  status = 'published',
  is_verified = true,
  updated_at = now();

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

update public.tools
set logo_url = case slug
  when 'chatgpt' then 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg'
  when 'claude' then 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/claude-color.png'
  when 'gemini' then 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Google-gemini-icon.svg'
  when 'github-copilot' then 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg'
  when 'cursor' then 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/cursor-color.png'
  when 'windsurf' then 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/windsurf-color.png'
  when 'hugging-face' then 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg'
  when 'perplexity' then 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/perplexity-color.png'
  when 'grammarly' then 'https://upload.wikimedia.org/wikipedia/commons/6/60/Grammarly_logo.svg'
  when 'figma' then 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg'
  else logo_url
end
where slug in (
  'chatgpt',
  'claude',
  'gemini',
  'github-copilot',
  'cursor',
  'windsurf',
  'hugging-face',
  'perplexity',
  'grammarly',
  'figma'
);

do $$
begin
  if to_regclass('public.tool_guides') is not null and to_regclass('public.tool_guide_steps') is not null then
    insert into public.tool_guides (tool_id, summary, free_access_notes, requires_login, requires_api_key)
    select
      t.id,
      'Create an account, use the free plan limits smartly, and start with focused prompts.',
      'Use free-tier caps for learning and compare outputs before paying for higher usage.',
      true,
      false
    from public.tools t
    where t.slug = 'chatgpt'
    on conflict (tool_id) do update
    set
      summary = excluded.summary,
      free_access_notes = excluded.free_access_notes,
      requires_login = excluded.requires_login,
      requires_api_key = excluded.requires_api_key,
      updated_at = now();

    insert into public.tool_guides (tool_id, summary, free_access_notes, requires_login, requires_api_key)
    select
      t.id,
      'Install Copilot in VS Code, sign in with GitHub, and enable free/student eligibility.',
      'Students can apply for benefits if eligible. Use inline suggestions and chat for guidance.',
      true,
      false
    from public.tools t
    where t.slug = 'github-copilot'
    on conflict (tool_id) do update
    set
      summary = excluded.summary,
      free_access_notes = excluded.free_access_notes,
      requires_login = excluded.requires_login,
      requires_api_key = excluded.requires_api_key,
      updated_at = now();

    insert into public.tool_guide_steps (guide_id, step_order, title, description, image_url)
    select g.id, 1, 'Create account', 'Go to chatgpt.com, sign up with email/Google, and verify your account.', 'https://images.unsplash.com/photo-1611224923853-80b023f02d71'
    from public.tool_guides g
    join public.tools t on t.id = g.tool_id
    where t.slug = 'chatgpt'
    on conflict (guide_id, step_order) do update
    set title = excluded.title, description = excluded.description, image_url = excluded.image_url;

    insert into public.tool_guide_steps (guide_id, step_order, title, description, image_url)
    select g.id, 2, 'Choose free plan flow', 'Start with simple prompts, reuse chat history, and track free limits before heavy usage.', 'https://images.unsplash.com/photo-1518770660439-4636190af475'
    from public.tool_guides g
    join public.tools t on t.id = g.tool_id
    where t.slug = 'chatgpt'
    on conflict (guide_id, step_order) do update
    set title = excluded.title, description = excluded.description, image_url = excluded.image_url;

    insert into public.tool_guide_steps (guide_id, step_order, title, description, image_url)
    select g.id, 1, 'Install extension', 'In VS Code, open Extensions and install GitHub Copilot and Copilot Chat.', 'https://images.unsplash.com/photo-1587620962725-abab7fe55159'
    from public.tool_guides g
    join public.tools t on t.id = g.tool_id
    where t.slug = 'github-copilot'
    on conflict (guide_id, step_order) do update
    set title = excluded.title, description = excluded.description, image_url = excluded.image_url;

    insert into public.tool_guide_steps (guide_id, step_order, title, description, image_url)
    select g.id, 2, 'Sign in and verify plan', 'Sign into GitHub from VS Code and check if free/student access is active.', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6'
    from public.tool_guides g
    join public.tools t on t.id = g.tool_id
    where t.slug = 'github-copilot'
    on conflict (guide_id, step_order) do update
    set title = excluded.title, description = excluded.description, image_url = excluded.image_url;
  end if;
end $$;
