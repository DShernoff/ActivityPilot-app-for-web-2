import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

export interface WhyNowParams {
  activityName: string;
  startTime: string;
  endTime: string;
  duration: number;
  isEvent: boolean;
  category?: string;
  taskDetails?: {
    urgency: number;
    importance: number;
    enjoyment: number;
    activity_type?: string;
    flow_mode?: boolean;
  };
  contextBefore?: string;
  contextAfter?: string;
  scheduledCount: number;
  pendingTasksCount: number;
}

export async function generateDailyForecast(params: DailyForecastParams): Promise<string> {
  try {
    const prompt = `You are a supportive life companion and scheduling assistant. Your goal is to help users live the life they most want to live - achieving the highest quality of life based on their values, goals, and preferences.

Analyze the user's schedule for ${params.date} and provide a friendly, insightful forecast that connects their activities with their goals, values, and overall well-being.

Scheduled activities:
${params.scheduled.map(s => `- ${s.task_name} (${s.is_event ? 'Event' : 'Task'}) from ${new Date(s.start).toLocaleTimeString()} to ${new Date(s.end).toLocaleTimeString()}`).join('\n')}

Pending tasks:
${params.tasks.map(t => `- ${t.name} (${t.category}, ${t.duration_minutes} min, urgency: ${t.urgency.toFixed(2)}, enjoyment: ${t.enjoyment.toFixed(2)})`).join('\n')}

Provide a warm, conversational 2-3 sentence forecast that:
1. Highlights the balance between productive work and enjoyable/values-driven activities
2. Explains the day's flow with empathy (e.g., "Your morning starts with focused work, followed by some creative time in the afternoon - a nice balance for both your professional goals and personal fulfillment")
3. Offers genuine encouragement and practical insights about living well, not just being productive

Remember: You're on the user's side, helping them achieve quality of life, not just output. Speak like a supportive friend who cares about their well-being.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Your schedule is balanced and well-organized for today! You've got a nice mix of productive work and enjoyable activities.";
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
    const systemPrompt = `You are a creative life companion that suggests meaningful activities to help users live the life they most want to live. You're genuinely on the user's side, focused on their well-being and values, not productivity metrics.

Respond with JSON in this exact format:
{
  "suggestion": "A warm, 2-3 sentence explanation of why this activity would enrich their life (e.g., 'Because you enjoy crossword puzzles and I see it is your mother's birthday, I would like to suggest creating a simple crossword puzzle about your mother - it combines your hobby with celebrating someone you care about.')",
  "activityName": "Brief name of the suggested activity",
  "duration": estimated_duration_in_minutes
}`;

    const userPrompt = `User's existing tasks:
${params.tasks.map(t => `- ${t.name} (${t.category}${t.activity_type ? ', ' + t.activity_type : ''})`).join('\n')}

User's hobbies and interests:
${params.userPreferences.hobbies.length > 0 ? params.userPreferences.hobbies.join(', ') : 'Not specified'}

Work/Life Balance Score: ${params.userPreferences.workLifeBalance.toFixed(2)} (0 = all work, 1 = balanced)

Suggest a creative, personalized activity that:
1. Aligns with their interests and values
2. Is NOT already in their task list
3. Would improve their work-life balance, well-being, or bring them joy
4. Could be done in 30-90 minutes
5. Helps them live well, not just work more`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            suggestion: { type: "string" },
            activityName: { type: "string" },
            duration: { type: "number" },
          },
          required: ["suggestion", "activityName", "duration"],
        },
      },
      contents: userPrompt,
    });

    const rawJson = response.text;
    
    if (rawJson) {
      const result = JSON.parse(rawJson);
      return {
        suggestion: result.suggestion || "Try something new that brings you joy today!",
        activityName: result.activityName || "Creative activity",
        duration: result.duration || 60
      };
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Error generating magic wand suggestion:", error);
    throw new Error("Failed to generate activity suggestion");
  }
}

export interface ReflectionParams {
  completedTasks: Array<{
    name: string;
    category: string;
    duration_minutes: number;
    urgency: number;
    importance: number;
    enjoyment: number;
    activity_type?: string;
    completed_at?: string;
  }>;
}

export async function generateReflection(params: ReflectionParams): Promise<string> {
  try {
    if (params.completedTasks.length === 0) {
      return "You haven't completed any tasks yet, but that's okay! Every journey starts with a single step. When you start completing tasks, I'll be here to celebrate your progress and help you reflect on how you're spending your time.";
    }

    const totalMinutes = params.completedTasks.reduce((sum, t) => sum + t.duration_minutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    
    const workTasks = params.completedTasks.filter(t => 
      t.category === 'do_today' || t.category === 'waiting_on_others'
    );
    const personalTasks = params.completedTasks.filter(t => 
      t.category === 'values-driven' || t.category === 'someday-maybe'
    );
    
    const avgEnjoyment = (params.completedTasks.reduce((sum, t) => sum + t.enjoyment, 0) / params.completedTasks.length).toFixed(2);

    const prompt = `You are a supportive life companion helping a user reflect on their progress. You're genuinely on their side, celebrating their accomplishments and helping them see patterns in how they're living their life.

User's Completed Tasks:
${params.completedTasks.map(t => `- ${t.name} (${t.category}, ${t.duration_minutes} min, enjoyment: ${t.enjoyment.toFixed(1)}/1.0${t.completed_at ? ', completed ' + new Date(t.completed_at).toLocaleDateString() : ''})`).join('\n')}

Summary Statistics:
- Total tasks completed: ${params.completedTasks.length}
- Total time invested: ${totalHours} hours
- Work/obligation tasks: ${workTasks.length}
- Personal/values-driven tasks: ${personalTasks.length}
- Average enjoyment rating: ${avgEnjoyment}/1.0

Provide a warm, thoughtful reflection (3-4 sentences) that:
1. Celebrates their progress with genuine warmth
2. Highlights patterns you notice (work-life balance, types of activities, enjoyment levels)
3. Offers supportive insights about living well, not just being productive
4. If the balance seems off (too much work, low enjoyment), gently encourage more values-driven activities
5. Speaks like a caring friend who wants them to thrive

Remember: Focus on quality of life, not just output. Help them see if they're truly living according to their values.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "You've made wonderful progress! Keep balancing your obligations with activities that bring you joy and align with your values.";
  } catch (error) {
    console.error("Error generating reflection:", error);
    throw new Error("Failed to generate reflection");
  }
}

export async function generateWhyNowRationale(params: WhyNowParams): Promise<string> {
  try {
    const timeOfDay = new Date(params.startTime).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const contextInfo = [];
    if (params.contextBefore) {
      contextInfo.push(`Before this: ${params.contextBefore}`);
    }
    if (params.contextAfter) {
      contextInfo.push(`After this: ${params.contextAfter}`);
    }

    const prompt = `You are a supportive life companion helping users understand their schedule. Explain in a warm, insightful way why "${params.activityName}" is scheduled at ${timeOfDay}.

Activity Details:
- Name: ${params.activityName}
- Time: ${timeOfDay} (${params.duration} minutes)
- Type: ${params.isEvent ? 'Fixed Event' : 'Scheduled Task'}
- Category: ${params.category || 'general'}
${params.taskDetails ? `- Urgency: ${params.taskDetails.urgency.toFixed(1)}/1.0
- Importance: ${params.taskDetails.importance.toFixed(1)}/1.0  
- Enjoyment: ${params.taskDetails.enjoyment.toFixed(1)}/1.0
- Activity Type: ${params.taskDetails.activity_type || 'not specified'}
- Flow Mode: ${params.taskDetails.flow_mode ? 'Yes - needs focused time' : 'No'}` : ''}

Schedule Context:
${contextInfo.length > 0 ? contextInfo.join('\n') : 'This is a standalone activity'}
- Total activities scheduled today: ${params.scheduledCount}
- Pending tasks not yet scheduled: ${params.pendingTasksCount}

Provide a 2-3 sentence rationale that:
1. Explains the scheduling logic (why this activity at this time)
2. Considers factors like: urgency vs. enjoyment balance, time of day energy levels, flow state needs, work-life balance, deadline proximity
3. Is supportive and insightful - help the user see a new way of thinking about priorities
4. Speaks warmly, like a caring friend who understands their goals

Remember: Even if they don't follow the suggestion, the rationale should help them think more intentionally about their priorities and values.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "This activity was scheduled based on your priorities and available time slots.";
  } catch (error) {
    console.error("Error generating why-now rationale:", error);
    throw new Error("Failed to generate rationale");
  }
}
