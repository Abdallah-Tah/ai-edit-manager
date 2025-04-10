type AnthropicResponse = {
    content: { text: string }[];
  };
  
  export async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  
    const data = (await res.json()) as AnthropicResponse;
    return data.content?.[0]?.text?.trim() || '';
  }
  