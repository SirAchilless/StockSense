import type { AIProvider } from './types';
import { NvidiaNimAdapter } from './nvidia-nim-adapter';
import { MockAIAdapter } from './mock-ai-adapter';

export { MockAIAdapter } from './mock-ai-adapter';
export { NvidiaNimAdapter } from './nvidia-nim-adapter';
export { runResearchPipeline, runChatPipeline, runGlobalNotePipeline, DISCLAIMER } from './grounding-pipeline';
export type { ResearchPipelineResult, GlobalNotePipelineInput } from './grounding-pipeline';
export type { ResearchResponse, ChatResponse, GlobalNoteResponse, AIProvider } from './types';

let _instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_instance) return _instance;
  const mode = process.env.NIM_MODE;
  if (mode === 'cloud' || mode === 'local') {
    _instance = new NvidiaNimAdapter();
    console.log(`[ai] Using NvidiaNimAdapter (${mode} mode)`);
  } else {
    _instance = new MockAIAdapter();
    console.log('[ai] Using MockAIAdapter — set NIM_MODE=cloud to use NVIDIA NIM');
  }
  return _instance;
}
