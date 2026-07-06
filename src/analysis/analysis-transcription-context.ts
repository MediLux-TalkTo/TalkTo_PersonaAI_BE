import type {
  AiIntakeContext,
  AiSubjectContext,
} from '../ai/ai-analysis-transcription.types';
import { FamilyGlossaryTerm } from '../subjects/family-glossary-term.entity';
import { Subject } from '../subjects/subject.entity';
import { PersonaIntake } from '../voice-persona/persona-intake.entity';
import { TargetVoiceSample } from '../voice-persona/target-voice-sample.entity';

type IntakeSectionName =
  | 'basicProfile'
  | 'familyMap'
  | 'timeline'
  | 'speechStyle'
  | 'personality'
  | 'sensoryMemories'
  | 'situationalReactions';

export function buildGlossaryTerms(
  glossaryTerms: readonly FamilyGlossaryTerm[],
): readonly string[] {
  return uniqueStrings(
    glossaryTerms
      .map((term) => term.term.trim())
      .filter((term) => term.length > 0),
  );
}

export function buildSubjectContext(input: {
  readonly subject: Subject;
  readonly glossaryTerms: readonly string[];
}): AiSubjectContext {
  return {
    subject: {
      addressTerm: input.subject.relationship,
      name: input.subject.displayName,
    },
    familyMembers: [],
    glossaryTerms: input.glossaryTerms,
  };
}

export function mapIntakeContext(input: {
  readonly intake: PersonaIntake;
  readonly glossaryTerms: readonly string[];
  readonly subjectName: string;
  readonly sample: TargetVoiceSample | null;
}): AiIntakeContext {
  const sections = emptyIntakeSections();
  let memoryCards: readonly unknown[] = [];
  let tabooTopics: readonly unknown[] = [];
  for (const section of input.intake.sections) {
    const sectionName = intakeSectionName(section.sectionKey);
    if (sectionName) {
      sections[sectionName] = section.answers;
      continue;
    }
    const arraySectionName = intakeArraySectionName(section.sectionKey);
    if (arraySectionName === 'memoryCards') {
      memoryCards = firstArrayField(section.answers, ['memoryCards', 'cards', 'items']);
    }
    if (arraySectionName === 'tabooTopics') {
      tabooTopics = firstArrayField(section.answers, ['tabooTopics', 'topics', 'items']);
    }
  }

  return {
    ...sections,
    memoryCards,
    tabooTopics,
    sttHints: {
      names: uniqueStrings([input.subjectName, ...input.glossaryTerms]),
      ...(input.sample
        ? {
            voiceSampleRef: {
              documentId: input.sample.id,
            },
          }
        : {}),
    },
  };
}

function emptyIntakeSections(): Record<IntakeSectionName, Record<string, unknown>> {
  return {
    basicProfile: {},
    familyMap: {},
    timeline: {},
    speechStyle: {},
    personality: {},
    sensoryMemories: {},
    situationalReactions: {},
  };
}

function intakeSectionName(sectionKey: string): IntakeSectionName | null {
  const normalized = normalizeSectionKey(sectionKey);
  switch (normalized) {
    case 'basicprofile':
    case 'profile':
      return 'basicProfile';
    case 'familymap':
      return 'familyMap';
    case 'timeline':
      return 'timeline';
    case 'speechstyle':
      return 'speechStyle';
    case 'personality':
      return 'personality';
    case 'sensorymemories':
      return 'sensoryMemories';
    case 'situationalreactions':
      return 'situationalReactions';
    default:
      return null;
  }
}

function intakeArraySectionName(sectionKey: string): 'memoryCards' | 'tabooTopics' | null {
  const normalized = normalizeSectionKey(sectionKey);
  switch (normalized) {
    case 'memorycards':
      return 'memoryCards';
    case 'tabootopics':
      return 'tabooTopics';
    default:
      return null;
  }
}

function normalizeSectionKey(sectionKey: string): string {
  return sectionKey.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function firstArrayField(
  section: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): readonly unknown[] {
  for (const key of keys) {
    const value = section[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
