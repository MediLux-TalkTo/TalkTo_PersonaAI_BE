export type AiAnalysisTranscriptionMode = 'full' | 'preview';

export type AiSubjectContext = {
  readonly subject: {
    readonly addressTerm: string | null;
    readonly name: string | null;
  };
  readonly familyMembers: readonly {
    readonly name: string;
    readonly relationToSubject: string | null;
    readonly addressTerms: readonly string[];
  }[];
  readonly glossaryTerms: readonly string[];
};

export type AiIntakeContext = {
  readonly basicProfile: Readonly<Record<string, unknown>>;
  readonly speechStyle: string;
  readonly personality: string;
  readonly familyMap: readonly unknown[];
  readonly situationalReactions: readonly unknown[];
  readonly tabooTopics: readonly string[];
  readonly memoryCards: readonly unknown[];
  readonly sttHints: {
    readonly names: readonly string[];
    readonly voiceSampleRef?: {
      readonly documentId: string;
      readonly startMs?: number;
      readonly endMs?: number;
    };
  };
};

export type AiAnalysisTranscriptionRequest = {
  readonly jobId: string;
  readonly recordingId: string;
  readonly audioUrl: string;
  readonly audioMimeType?: string;
  readonly mode: AiAnalysisTranscriptionMode;
  readonly language: string;
  readonly speakerDiarization: boolean;
  readonly glossary: readonly string[];
  readonly subjectContext: AiSubjectContext;
  readonly intakeContext: AiIntakeContext | null;
};

export type AiPersonaResponseRequest = {
  readonly message: string;
  readonly history: readonly {
    readonly role: 'user' | 'assistant';
    readonly content: string;
  }[];
  readonly memories: readonly {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly tags?: readonly string[];
  }[];
  readonly persona: {
    readonly subjectId: string;
    readonly instructions: string;
    readonly voiceId: string | null;
  };
};

export type AiPersonaResponse = {
  readonly content: string;
  readonly retrievedMemoryIds?: readonly string[];
  readonly retrieved_memory_ids?: readonly string[];
  readonly provider?: string;
  readonly model?: string;
  readonly latency_ms?: number;
};

export type AiPersonaAssemblyRequest = {
  readonly subjectContext: AiSubjectContext;
  readonly intakeContext: AiIntakeContext;
  readonly speechExamples: readonly string[];
};

export type AiPersonaAssemblyResponse = {
  readonly instructions: string;
  readonly subjectName?: string;
};

export type AiAnalysisTranscriptionSegment = {
  readonly segmentIndex?: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly speakerLabel?: string;
  readonly transcriptText?: string;
  readonly text?: string;
  readonly correctedText?: string | null;
  readonly needsReview?: boolean;
  readonly confidence?: number;
};

export type AiAnalysisTranscriptionResponse = {
  readonly segments: readonly AiAnalysisTranscriptionSegment[];
  readonly provider?: string;
  readonly model?: string;
};
