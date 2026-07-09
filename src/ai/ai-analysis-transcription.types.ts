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
  readonly referenceVoiceSampleUrl?: string;
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
  readonly personaInsights?: readonly string[];
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
  readonly subjectSpeakerLabel?: string | null;
  readonly provider?: string;
  readonly model?: string;
};

export type AiEmbeddingRequest = {
  readonly jobId: string;
  readonly items: readonly {
    readonly memorySegmentId: string;
    readonly embeddingIndex: number;
    readonly text: string;
  }[];
};

export type AiEmbeddingResponse = {
  readonly embeddings: readonly {
    readonly memorySegmentId: string;
    readonly embedding: readonly number[];
  }[];
  readonly provider?: string;
  readonly model?: string;
};

export type AiRecordingAnalysisRequest = {
  readonly jobId: string;
  readonly recordingId: string;
  readonly transcriptSegments: readonly {
    readonly id: string;
    readonly segmentIndex: number;
    readonly startMs: number;
    readonly endMs: number;
    readonly speakerLabel: string;
    readonly transcriptText: string;
  }[];
  readonly subjectContext: AiSubjectContext;
  readonly subjectSpeakerLabel?: string | null;
  readonly conversationPartnerName?: string | null;
};

export type AiRecordingAnalysisResponse = {
  readonly memorySegments: readonly {
    readonly segmentIndex: number;
    readonly sourceTranscriptSegmentIds: readonly string[];
    readonly startMs: number;
    readonly endMs: number;
    readonly speakerLabel?: string;
    readonly memoryText: string;
    readonly confidence?: 'confirmed' | 'inferred';
    readonly importanceScore?: number;
    readonly tags?: readonly string[];
    readonly relatedPeople?: readonly string[];
    readonly sensitivityFlags?: readonly string[];
  }[];
  readonly summary?: string;
  readonly tags?: readonly string[];
  readonly speechStyle?: unknown;
  readonly safetyFlags?: readonly {
    readonly type: string;
    readonly description: string;
    readonly sourceTranscriptSegmentIds?: readonly string[];
  }[];
  readonly provider?: string;
  readonly model?: string;
};

export type AiReflectionRequest = {
  readonly subjectContext: AiSubjectContext;
  readonly memories: readonly {
    readonly id: string;
    readonly memoryText: string;
    readonly tags: readonly string[];
    readonly importanceScore: number;
  }[];
};

export type AiReflectionResponse = {
  readonly reflections: readonly {
    readonly insight: string;
    readonly category: string;
    readonly evidenceMemoryIds: readonly string[];
    readonly importance: number;
  }[];
  readonly provider?: string;
  readonly model?: string;
};

export type AiVoiceCloneRequest = {
  readonly name: string;
  readonly sampleAudioUrl: string;
};

export type AiVoiceCloneResponse = {
  readonly voiceId: string;
  readonly provider?: string;
};
