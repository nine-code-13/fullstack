'use server';

import { OpenAI } from 'openai';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export async function startInterview(): Promise<{ id: number; role: 'assistant'; content: string }> {
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: '你是一位资深的前端面试官，擅长面试初级到中级前端开发工程师。请你友好地开始面试，先自我介绍一下，然后提出第一个问题。',
      },
    ],
    stream: false,
  });

  return {
    id: Date.now(),
    role: 'assistant',
    content: response.choices[0]?.message?.content || '',
  };
}

export async function sendMessage(
  history: Array<{ role: 'assistant' | 'user'; content: string }>,
  message: string
): Promise<{ id: number; role: 'assistant'; content: string }> {
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: '你是一位资深的前端面试官，擅长面试初级到中级前端开发工程师。请你根据用户的回答继续提问，保持面试的流畅性和专业性。',
      },
      ...history,
      { role: 'user', content: message },
    ],
    stream: false,
  });

  return {
    id: Date.now(),
    role: 'assistant',
    content: response.choices[0]?.message?.content || '',
  };
}