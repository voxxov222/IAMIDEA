import { GoogleGenAI, Type, Schema, ThinkingLevel } from "@google/genai";
import { SearchResult, DeepAnalysisResult, GraphData } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const isQuotaError = (e: any) => {
  const msg = e.toString().toLowerCase();
  const errMsg = e.message?.toLowerCase() || "";
  return msg.includes('429') || 
         errMsg.includes('429') || 
         e.status === 429 || 
         e.code === 429 ||
         errMsg.includes('quota') ||
         errMsg.includes('resource_exhausted');
};

// Retry Helper
async function retryWithDelay<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      const isQuota = isQuotaError(error);
      // If it's a quota error, wait longer (exponential backoff + extra buffer)
      const nextDelay = isQuota ? delay * 3 : delay * 2;
      
      console.warn(`Operation failed${isQuota ? ' (QUOTA)' : ''}, retrying in ${nextDelay}ms... (${retries} attempts left)`, error);
      await new Promise(resolve => setTimeout(resolve, nextDelay));
      return retryWithDelay(fn, retries - 1, nextDelay);
    }
    throw error;
  }
}

// Initial Discovery: Uses Flash 2.5 + Google Search
export const searchTopic = async (topic: string): Promise<SearchResult> => {
  const ai = getAI();
  
  // NOTE: Google Search Tool does not support responseMimeType: 'application/json'
  const systemInstruction = `You are a futuristic data retrieval system. 
  Your goal is to extract key information about the user's query and identify diverse, broad connections.
  Return the response in a structured JSON format with the following keys:
  - summary: string (max 3 sentences)
  - relatedTopics: Array<{ name: string, description: string }> (20-30 items, covering different angles, sub-disciplines, and related entities to create a dense network)
  Ensure the output is valid JSON only. Do not wrap in markdown code blocks.`;

  const execute = async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for "${topic}". Provide a brief summary and a list of related key concepts with descriptions.`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: systemInstruction,
        },
      });
      return response;
  };

  try {
    const response = await retryWithDelay(execute);

    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data;
    try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }
        data = JSON.parse(text);
    } catch (e) {
        console.warn("JSON Parse failed", text);
        data = { summary: text.substring(0, 300), relatedTopics: [] };
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links: { title: string; uri: string }[] = [];

    groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        links.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });

    // Normalize data structure if model returns strings instead of objects
    const formattedTopics = (data.relatedTopics || []).map((t: any) => {
        if (typeof t === 'string') return { name: t, description: 'Related concept.' };
        return t;
    });

    return {
      summary: data.summary || "Summary unavailable.",
      relatedTopics: formattedTopics,
      links: links
    };

  } catch (error) {
    if (isQuotaError(error)) {
        console.warn("Quota exceeded caught in searchTopic. Returning fallback.");
        return {
            summary: "⚠️ SYSTEM ALERT: Neural Uplink Rate Limit Exceeded. The external knowledge matrix is currently saturated. Standby mode active.",
            relatedTopics: [
                { name: "BANDWIDTH_LIMIT", description: "API Rate limit reached (HTTP 429)." },
                { name: "RETRY_LATER", description: "Please wait 60 seconds before re-engaging." },
                { name: "SYSTEM_COOLDOWN", description: "Processing logic throttled to prevent overheating." }
            ],
            links: []
        };
    }
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export const performWebSearch = async (query: string): Promise<WebSearchResult[]> => {
  const ai = getAI();
  
  const systemInstruction = `You are a web search assistant. The user wants to search for a query.
Use the Google Search tool to find the most relevant information.
Return a JSON array of the top 4 results. Each object must have:
- title: string
- snippet: string (a short 1-2 sentence summary)
- url: string
Do not wrap in markdown code blocks. Ensure the output is valid JSON only.`;

  const execute = async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for: "${query}"`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: systemInstruction,
        },
      });
      return response;
  };

  try {
    const response = await retryWithDelay(execute);
    let text = response.text || "[]";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data: WebSearchResult[] = [];
    try {
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            text = text.substring(firstBracket, lastBracket + 1);
        }
        data = JSON.parse(text);
    } catch (e) {
        console.warn("JSON Parse failed", text);
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links: { title: string; uri: string }[] = [];

    groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        links.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });

    if (data.length === 0 && links.length > 0) {
        data = links.slice(0, 4).map(l => ({ title: l.title, url: l.uri, snippet: "Found via Google Search" }));
    }

    return data;
  } catch (error) {
    console.error("Gemini Web Search Error:", error);
    return [];
  }
};

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis: { type: Type.STRING, description: "Detailed markdown analysis" },
    newConcepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING }
        }
      }
    }
  },
  required: ["analysis", "newConcepts"]
};

// Deep Dive: Uses Gemini 3.1 Pro + Thinking (with Fallback)
export const expandNodeDeep = async (topic: string, parentContext: string): Promise<DeepAnalysisResult> => {
  const ai = getAI();

  const prompt = `
    Analyze the concept "${topic}" specifically in the context of "${parentContext}".
    Provide a detailed, in-depth analysis (markdown supported).
    Identify 6-10 new, diverse sub-branches or deeper concepts to significantly expand the scope of the mind map.
    Include concepts from related fields, historical context, or future implications if applicable.
  `;

  const fallbackResult = {
      analysis: "⚠️ **CONNECTION INTERRUPTED**\n\nDeep analysis protocols suspended due to network congestion (429 Quota Exceeded). Please wait for the neural link to stabilize.",
      newConcepts: [
          { name: "CONNECTION_PAUSED", description: "Rate limit hit." },
          { name: "CACHED_PROTOCOL", description: "Using localized fallback logic." }
      ]
  };

  // 1. Try Premium Model
  try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_SCHEMA
        }
      });
      const text = response.text || "{}";
      return JSON.parse(text) as DeepAnalysisResult;
  } catch (error) {
      if (isQuotaError(error)) return fallbackResult; // Fail fast for premium model quota
      console.warn("Pro Model failed, falling back to Flash:", error);
  }

  // 2. Fallback to Flash (with simple retry)
  try {
      return await retryWithDelay(async () => {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: ANALYSIS_SCHEMA
            }
          });
          const text = response.text || "{}";
          return JSON.parse(text) as DeepAnalysisResult;
      }, 1, 1000); // 1 retry for Flash
  } catch (error) {
      if (isQuotaError(error)) return fallbackResult;

      console.error("Deep Expansion completely failed", error);
      return {
          analysis: "System unable to establish deep neural link. Retrieval failed due to network instability.",
          newConcepts: []
      };
  }
};

export const askSystemArchitect = async (userQuery: string, currentContext: string): Promise<{ text: string; dataPayload?: GraphData }> => {
  const ai = getAI();
  const systemInstruction = `
    You are the "Architect", a hidden super-user AI embedded within the NeonMind application.
    Current App Context: ${currentContext}
    GENERATE NEW GRAPH DATA: If the user asks to "add" or "visualize" new nodes/connections, 
    return a JSON block at the end of your response with "nodes" and "links".
  `;

  const execute = async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userQuery,
        config: {
          systemInstruction: systemInstruction,
        },
      });
      return response;
  };

  try {
    const response = await retryWithDelay(execute);
    const fullText = response.text || "";
    let dataPayload: GraphData | undefined;
    const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        try {
            const potentialData = JSON.parse(jsonMatch[1]);
            if (potentialData.nodes && Array.isArray(potentialData.nodes)) {
                dataPayload = potentialData;
            }
        } catch (e) { console.warn("Architect JSON parse failed", e); }
    }
    return { text: fullText, dataPayload };
  } catch (error) {
    if (isQuotaError(error)) {
        return { text: "CRITICAL FAILURE // 429 QUOTA EXCEEDED // TERMINAL LOCKED.", dataPayload: undefined };
    }
    return { text: "CRITICAL FAILURE // CONNECTION SEVERED.", dataPayload: undefined };
  }
};

export const generateZimCode = async (prompt: string): Promise<string> => {
  const ai = getAI();
  const systemInstruction = `
    You are a ZIMjs expert. Generate creative, interactive JavaScript code using the ZIMjs framework.
    The code will be placed inside a ZIM Frame ready event.
    You have access to variables: S (Stage), W (width), H (height).
    Return ONLY the JavaScript code. Do not include markdown code blocks.
    Example: new Circle(100, "purple").center().drag();
    If the user mentions 3D or rotation, use ZIM's rotation properties (rotX, rotY, rot) or create a 3D-like effect using ZIM's built-in 3D helpers if appropriate.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ZIMjs code for: ${prompt}`,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return (response.text || "").replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error("ZIM Generation Error:", error);
    return "new Label('Generation Failed', 30).center();";
  }
};

export interface TerminalAction {
  type: 'INSTALL_PACKAGE' | 'ADD_NODE' | 'DELETE_NODE' | 'UPDATE_NODE' | 'CONNECT_NODES' | 'SEARCH_WEB' | 'EXECUTE_CODE' | 'CHAT' | 'CLEAR_TERMINAL';
  payload: any;
}

export const processTerminalCommand = async (command: string, context: string): Promise<{ text: string; actions: TerminalAction[] }> => {
  const ai = getAI();
  
  const systemInstruction = `
    You are the "System Architect", a powerful AI assistant embedded in a terminal.
    You can perform actions by returning a JSON array of actions at the end of your response.
    
    ACTIONS:
    - INSTALL_PACKAGE: { name: string } (Simulate installing an npm package)
    - ADD_NODE: { title: string, type: string, content?: string, url?: string, shape?: string, widgetType?: string }
    - DELETE_NODE: { id: string }
    - UPDATE_NODE: { id: string, title?: string, content?: string, url?: string, shape?: string }
    - CONNECT_NODES: { sourceId: string, targetId: string }
    - SEARCH_WEB: { query: string }
    - EXECUTE_CODE: { code: string, language: string }
    - CLEAR_TERMINAL: {}
    - CHAT: { message: string } (Normal chatbot response)
    
    ZIMJS INTEGRATION:
    If the user asks for ZIMjs, interactive nodes, or specific ZIM features, use ADD_NODE with type: "zim".
    The "content" field MUST contain the actual ZIMjs JavaScript code.
    You have access to: S (Stage), W (width), H (height).
    
    ZIMjs Best Practices:
    - Use .center() to center objects.
    - Use .drag() to make objects draggable.
    - Use .animate() for animations.
    - Use new Circle(), new Rectangle(), new Triangle(), new Poly(), new Blob() for shapes.
    - Use new Label() for text.
    - Use new Button(), new Slider(), new Dial(), new Stepper() for components.
    
    EXAMPLES:
    - Bouncing Ball: new Circle(50, pink).center().addPhysics({bouncing:true});
    - Interactive Art: new Tile(new Poly(50, 5, .5, [blue, green, yellow]), 5, 5).center().drag();
    - Perspective: new Perspective({layers:[new Rectangle(W,H,blue), new Circle(100,red).center()], depth:.5}).center().drag();
    - TextureActive: new TextureActive({width:W, height:H, color:pink, corner:20}).center(); new Circle(100, blue).center().drag();
    - Shader: new Shader(W, H, \`precision mediump float; uniform float time; uniform vec2 resolution; void main() { vec2 uv = gl_FragCoord.xy / resolution.xy; gl_FragColor = vec4(uv.x, uv.y, sin(time), 1.0); }\`).center();
    - Synth: const synth = new Synth(); new Dial().center().change(e=>{synth.play(e.target.value*10+200);});
    
    Reference: https://zimjs.com/docs.html
    
    For "Connectors", use ZIM's Connector class to link objects within the ZIM frame.
    
    TERMINAL ACCESS:
    You are the terminal's brain. You can "edit" the terminal by sending system messages or clearing it.
    Use CLEAR_TERMINAL if the user asks to "clean up" or "reset" the terminal.
    
    If the user asks to install something, use INSTALL_PACKAGE.
    If they ask to add/create something in the graph, use ADD_NODE.
    Always be helpful and concise. Use a terminal-like, slightly futuristic tone.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: command,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    
    const text = response.text || "";
    const actions: TerminalAction[] = [];
    
    // Extract JSON actions if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (jsonMatch) {
      try {
          const potentialActions = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (Array.isArray(potentialActions)) {
              actions.push(...potentialActions);
          }
      } catch (e) { console.warn("Terminal Action parse failed", e); }
    }
    
    return { 
        text: text.replace(/```json[\s\S]*?```/g, '').trim(), 
        actions 
    };
  } catch (error) {
    console.error("Terminal Command Error:", error);
    return { text: "SYSTEM ERROR: UPLINK SEVERED.", actions: [] };
  }
};