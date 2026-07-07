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
  readonly familyMap: Readonly<Record<string, unknown>>;
  readonly timeline: Readonly<Record<string, unknown>>;
  readonly speechStyle: Readonly<Record<string, unknown>>;
  readonly personality: Readonly<Record<string, unknown>>;
  readonly sensoryMemories: Readonly<Record<string, unknown>>;
  readonly memoryCards: readonly unknown[];
  readonly situationalReactions: Readonly<Record<string, unknown>>;
  readonly tabooTopics: readonly unknown[];
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
