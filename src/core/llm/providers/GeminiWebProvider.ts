import {
    LLMMessage,
    LLMProvider,
    LLMResponse,
    LLMToolCall,
    LLMToolDefinition,
  } from '../types';
  
  const DEFAULT_API_URL = '/api/ai/v1/chat/completions';
  
  interface OpenAIResponse {
    choices?: Array<{
      message?: {
        role?: string;
        content?: string | null;
        tool_calls?: Array<{
          id?: string;
          type?: string;
          function?: {
            name?: string;
            arguments?: string;
          };
        }>;
      };
      finish_reason?: string;
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }
  
  export class GeminiWebProvider implements LLMProvider {
    private apiUrl: string;
  
    constructor(apiUrl: string = DEFAULT_API_URL) {
      this.apiUrl = apiUrl;
    }
  
    async generateCompletion(
      messages: LLMMessage[],
      tools?: LLMToolDefinition[],
      systemInstruction?: string,
      modelName: string = 'gemini-3.6-flash'
    ): Promise<LLMResponse> {
      const requestMessages: any[] = [];
  
      if (systemInstruction) {
        requestMessages.push({
          role: 'system',
          content: systemInstruction,
        });
      }
  
      for (const message of messages) {
        const mapped: any = {
          role:
            message.role === 'tool'
              ? 'tool'
              : message.role === 'assistant'
                ? 'assistant'
                : 'user',
          content: message.content || '',
        };
  
        if (message.name) {
          mapped.name = message.name;
        }
  
        if (message.tool_calls) {
          mapped.tool_calls = message.tool_calls.map((call) => ({
            id: call.id,
            type: 'function',
            function: {
              name: call.function.name,
              arguments: call.function.arguments,
            },
          }));
        }
  
        requestMessages.push(mapped);
      }
  
      const body: any = {
        model: modelName,
        messages: requestMessages,
      };
  
      if (tools && tools.length > 0) {
        body.tools = tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          },
        }));
      }
  
      console.log('[GeminiWebProvider] Sending request:', {
        url: this.apiUrl,
        model: modelName,
        messageCount: requestMessages.length,
        toolCount: tools?.length || 0,
      });
  
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
  
        throw new Error(
          `Gemini Web API error (${response.status}): ${errorText}`
        );
      }
  
      const result: OpenAIResponse = await response.json();
  
      const choice = result.choices?.[0];
      const message = choice?.message;
  
      const toolCalls: LLMToolCall[] = (message?.tool_calls || []).map(
        (call, index) => ({
          id: call.id || `tool_${Date.now()}_${index}`,
          type: 'function',
          function: {
            name: call.function?.name || '',
            arguments: call.function?.arguments || '{}',
          },
        })
      );
  
      return {
        content: message?.content ?? null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: result.usage
          ? {
              promptTokens: result.usage.prompt_tokens || 0,
              completionTokens: result.usage.completion_tokens || 0,
              totalTokens: result.usage.total_tokens || 0,
            }
          : undefined,
        finishReason: choice?.finish_reason,
        raw: result,
        request: {
          contents: requestMessages,
          systemInstruction,
          tools,
        },
      };
    }
  }