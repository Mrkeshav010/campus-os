const groq = require('../config/groq');

// Sends the complaint description to Groq and asks it to classify urgency.
// Falls back to 'medium' if the AI call fails, so complaint creation
// never breaks just because the AI service is down.
const classifyComplaintPriority = async (description, category) => {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You classify hostel/mess complaints by urgency. Reply with exactly one word: low, medium, or high. High = safety/health risk or total service outage. Medium = inconvenient but workable. Low = minor/cosmetic.',
        },
        {
          role: 'user',
          content: `Category: ${category}\nComplaint: ${description}`,
        },
      ],
      temperature: 0,
      max_tokens: 5,
    });

    const raw = completion.choices[0]?.message?.content?.trim().toLowerCase();
    if (['low', 'medium', 'high'].includes(raw)) return raw;
    return 'medium';
  } catch (error) {
    console.error('Groq classification failed, defaulting to medium:', error.message);
    return 'medium';
  }
};

module.exports = { classifyComplaintPriority };