export interface Card {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'source' | 'summary' | 'note' | 'ai-response';
  color: string;
}

export interface Connection {
  id: string;
  fromCardId: string;
  toCardId: string;
  label?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export enum MethodologyStep {
  UPLOAD = 'UPLOAD',
  ORGANIZE = 'ORGANIZE',
  READ_DISCUSS = 'READ_DISCUSS',
  SYNTHESIZE = 'SYNTHESIZE'
}

export interface AppState {
  step: MethodologyStep;
  cards: Card[];
  connections: Connection[];
  chatHistory: ChatMessage[];
  apiKey: string | null;
}

export interface GeminiConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  thinkingBudget?: number;
}