---
name: explain
description: Explain what a file or section of code does in plain, simple English
---

The user will give you a file path, function name, or describe something they want to understand.

## Rules
- Explain like you're talking to someone who doesn't read code
- No jargon — if you must use a technical term, define it in parentheses
- Use analogies to everyday things when helpful
- Keep it short — aim for 3-5 sentences unless the user asks for more detail
- If it's a file, start with "This file handles..." and describe its purpose
- If it's a function, start with "This does..." and describe what it accomplishes
- Mention what calls it or when it runs if that helps understanding
- If the code has a bug or concern, mention it plainly

## Example
User: "explain server/storage.ts"
Response: "This file is like a librarian — it handles all reading and writing to the database. Every time the app needs to save a journal entry, look up a habit, or check a user's access, it goes through this file. No other file talks to the database directly. It has about 100 different operations organized by feature (journals, habits, eisenhower tasks, etc.)."
