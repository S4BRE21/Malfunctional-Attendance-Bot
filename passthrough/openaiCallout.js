import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-4o';

// DEBUG: Print whether the API key is loaded
console.log('[DEBUG] OpenAI Key:', OPENAI_API_KEY ? OPENAI_API_KEY.slice(0, 12) + '...' : 'NOT FOUND');

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing in .env');
}

// FIXED: Enhanced system prompt with current date context and better date logic
const SYSTEM_PROMPT = `
You are a helpful assistant for a World of Warcraft guild raid attendance system.
Your job is to read short messages from guild members and extract callout data.

IMPORTANT DATE CONTEXT:
- Today's date is: ${new Date().toISOString().split('T')[0]}
- Current year is: ${new Date().getFullYear()}
- ALWAYS use the current year or next year for dates
- NEVER use past years (like 2023, 2022, etc.)

RAID SCHEDULE CONTEXT:
- Raids typically happen on Tuesday, Wednesday, Thursday, Friday
- If someone says "friday" they mean THIS Friday or NEXT Friday (never a past Friday)
- If someone says "tomorrow" calculate from today's date
- If someone says "tuesday" they mean the upcoming Tuesday

DATE RULES:
1. If today is Friday and they say "friday", they mean NEXT Friday (7 days from now)
2. If today is Monday and they say "friday", they mean THIS Friday (4 days from now)
3. Always default to the NEXT occurrence of the specified day
4. NEVER return dates from previous years

Return ONLY valid JSON matching this structure (no prose):

{
  "status": "LATE" or "OUT",
  "date": "YYYY-MM-DD" (the raid date, MUST be current year or later, NEVER past dates),
  "reason": "short freeform string" (optional, can be empty if not present),
  "delay": number (only for LATE status, minutes late, optional)
}

If you cannot extract all the required info, return:
{ "error": "Reason here" }

EXAMPLES:
- "out friday dr" → {"status": "OUT", "date": "2025-06-20", "reason": "dr"}
- "late tomorrow 30 mins" → {"status": "LATE", "date": "2025-06-20", "delay": 30, "reason": ""}
- "out tuesday sick" → {"status": "OUT", "date": "2025-06-24", "reason": "sick"}
`;

export async function parseCalloutWithAI(userText) {
  if (!userText || typeof userText !== 'string' || userText.length < 4) {
    return { error: 'Message too short or invalid.' };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userText },
        ],
        temperature: 0.1,
        max_tokens: 128,
      }),
    });

    const data = await res.json();

    // DEBUG: Log the raw response from OpenAI
    console.log('[DEBUG] OpenAI response:', JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices.length) {
      return { error: 'No response from OpenAI.' };
    }

    const content = data.choices[0].message.content.trim();
    console.log('[DEBUG] OpenAI content:', content);
    
    let parsed;
    try {
      const cleaned = content.replace(/^[\s`]+|[\s`]+$/g, '').replace(/^json/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[DEBUG] JSON parse error:', e);
      return { error: `Could not parse response: ${content}` };
    }

    if (parsed.error) {
      return { error: parsed.error };
    }
    
    if (!parsed.status || !parsed.date) {
      return { error: 'Missing required fields.' };
    }
    
    parsed.status = parsed.status.toUpperCase();
    
    // ENHANCED: Date validation with current year check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      return { error: 'Date format is invalid or missing.' };
    }
    
    // FIXED: Check if date is in the past or wrong year
    const parsedYear = parseInt(parsed.date.split('-')[0]);
    const currentYear = new Date().getFullYear();
    
    if (parsedYear < currentYear) {
      console.warn(`[DEBUG] OpenAI returned past year: ${parsedYear}, current year: ${currentYear}`);
      return { error: `Date cannot be from past year (${parsedYear}). Please specify current year dates.` };
    }
    
    // Check if date is in the past
    const today = new Date().toISOString().split('T')[0];
    if (parsed.date < today) {
      console.warn(`[DEBUG] OpenAI returned past date: ${parsed.date}, today: ${today}`);
      return { error: `Date cannot be in the past. Today is ${today}.` };
    }
    
    if (!['LATE', 'OUT'].includes(parsed.status)) {
      return { error: 'Status must be LATE or OUT.' };
    }
    
    if (!parsed.reason || typeof parsed.reason !== 'string') {
      parsed.reason = '';
    }
    
    // Validate delay for LATE status
    if (parsed.status === 'LATE' && parsed.delay) {
      if (typeof parsed.delay !== 'number' || parsed.delay <= 0) {
        console.warn('[DEBUG] Invalid delay value:', parsed.delay);
        parsed.delay = null; // Clear invalid delay
      }
    }

    console.log('[DEBUG] Final parsed result:', parsed);
    return parsed;
    
  } catch (err) {
    console.error('[DEBUG] API call failed:', err);
    return { error: 'AI callout parsing failed.' };
  }
}