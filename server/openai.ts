import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DailyForecastParams {
  tasks: Array<{
    name: string;
    category: string;
    duration_minutes: number;
    urgency: number;
    importance: number;
    enjoyment: number;
  }>;
  scheduled: Array<{
    task_name: string;
    start: string;
    end: string;
    is_event: boolean;
  }>;
  date: string;
}

export interface MagicWandParams {
  tasks: Array<{
    name: string;
    category: string;
    activity_type?: string;
  }>;
  userPreferences: {
    hobbies: string[];
    workLifeBalance: number;
  };
}

export async function generateDailyForecast(params: DailyForecastParams): Promise<string> {
  try {
    const prompt = `You are a helpful scheduling assistant. Analyze the user's schedule for ${params.date} and provide a friendly, insightful forecast that connects their activities with their goals and priorities.

Scheduled activities:
${params.scheduled.map(s => `- ${s.task_name} (${s.is_event ? 'Event' : 'Task'}) from ${new Date(s.start).toLocaleTimeString()} to ${new Date(s.end).toLocaleTimeString()}`).join('\n')}

Pending tasks:
${params.tasks.map(t => `- ${t.name} (${t.category}, ${t.duration_minutes} min, urgency: ${t.urgency.toFixed(2)}, enjoyment: ${t.enjoyment.toFixed(2)})`).join('\n')}

Provide a 2-3 sentence forecast that:
1. Highlights the balance between work-intensive and relaxing activities
2. Explains the rationale for the scheduling (e.g., "Your early afternoon has several meetings and work-intensive items, so I have scheduled some relaxing activities like hobbies in the late afternoon")
3. Offers encouragement or practical insights

Keep it conversational and supportive.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a supportive scheduling assistant that helps users understand their daily schedule and stay motivated."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    return response.choices[0].message.content || "Your schedule is balanced and well-organized for today!";
  } catch (error) {
    console.error("Error generating daily forecast:", error);
    throw new Error("Failed to generate daily forecast");
  }
}

export async function generateMagicWandSuggestion(params: MagicWandParams): Promise<{
  suggestion: string;
  activityName: string;
  duration: number;
}> {
  try {
    const prompt = `You are a creative scheduling assistant. Based on the user's tasks and preferences, suggest a new activity that would enrich their life.

User's existing tasks:
${params.tasks.map(t => `- ${t.name} (${t.category}${t.activity_type ? ', ' + t.activity_type : ''})`).join('\n')}

User's hobbies and interests:
${params.userPreferences.hobbies.length > 0 ? params.userPreferences.hobbies.join(', ') : 'Not specified'}

Work/Life Balance Score: ${params.userPreferences.workLifeBalance.toFixed(2)} (0 = all work, 1 = balanced)

Suggest a creative, personalized activity that:
1. Aligns with their interests
2. Is NOT already in their task list
3. Would improve their work-life balance or wellbeing
4. Could be done in 30-90 minutes

Respond in JSON format:
{
  "suggestion": "A 2-3 sentence explanation of why this activity would be valuable (e.g., 'Because you like crossword puzzles, and I see it is your mother's birthday, I would like to suggest that you create a simple crossword puzzle about your mother.')",
  "activityName": "Brief name of the suggested activity",
  "duration": estimated_duration_in_minutes
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a creative assistant that suggests meaningful activities. Respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      suggestion: result.suggestion || "Try something new today!",
      activityName: result.activityName || "Creative activity",
      duration: result.duration || 60
    };
  } catch (error) {
    console.error("Error generating magic wand suggestion:", error);
    throw new Error("Failed to generate activity suggestion");
  }
}
