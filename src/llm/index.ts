import { callOpenAI } from './openai';
import { callAnthropic } from './anthropic';

export async function callLLM(provider: string, apiKey: string, model: string, prompt: string): Promise<string> {
  if (provider === 'openai') {
    return callOpenAI(apiKey, model, prompt);
  }
  
  if (provider === 'anthropic') { 
    return callAnthropic(apiKey, model, prompt);
  }
  throw new Error('Unsupported provider');
}
