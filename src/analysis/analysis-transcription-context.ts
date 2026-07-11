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
  | 'speechStyle'
  | 'personality'
  | 'situationalReactions';

export function buildGlossaryTerms(
  glossaryTerms: readonly FamilyGlossaryTerm[],
): readonly string[] {
  return uniqueStrings(
    glossaryTerms.flatMap((term) => [
      term.term.trim(),
      term.pronunciationHint?.trim() ?? '',
    ]),
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
    familyMembers: (input.subject.familyMembers ?? []).map((member) => ({
      name: member.name,
      relationToSubject: member.relationToSubject,
      addressTerms: member.addressTerms,
    })),
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
  let memoryCards = sections.memoryCards;
  let tabooTopics = sections.tabooTopics;
  for (const section of input.intake.sections) {
    const sectionName = intakeSectionName(section.sectionKey);
    if (sectionName) {
      assignIntakeSection(sections, sectionName, section.answers);
      continue;
    }
    const arraySectionName = intakeArraySectionName(section.sectionKey);
    if (arraySectionName === 'memoryCards') {
      memoryCards = firstArrayField(section.answers, ['memoryCards', 'cards', 'items']);
    }
    if (arraySectionName === 'tabooTopics') {
      tabooTopics = stringArraySectionValue(section.answers, [
        'tabooTopics',
        'topics',
        'items',
      ]);
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
              ...(input.sample.startMs !== null ? { startMs: input.sample.startMs } : {}),
              ...(input.sample.endMs !== null ? { endMs: input.sample.endMs } : {}),
            },
          }
        : {}),
    },
  };
}

type IntakeSections = {
  basicProfile: Readonly<Record<string, unknown>>;
  speechStyle: string;
  personality: string;
  familyMap: readonly unknown[];
  situationalReactions: readonly unknown[];
  memoryCards: readonly unknown[];
  tabooTopics: readonly string[];
};

function emptyIntakeSections(): IntakeSections {
  return {
    basicProfile: {},
    speechStyle: '',
    personality: '',
    familyMap: [],
    situationalReactions: [],
    memoryCards: [],
    tabooTopics: [],
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
    case 'speechstyle':
      return 'speechStyle';
    case 'personality':
      return 'personality';
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

function assignIntakeSection(
  sections: IntakeSections,
  sectionName: IntakeSectionName,
  answers: Readonly<Record<string, unknown>>,
): void {
  switch (sectionName) {
    case 'basicProfile':
      sections.basicProfile = answers;
      return;
    case 'speechStyle':
      sections.speechStyle = stringSectionValue(answers);
      return;
    case 'personality':
      sections.personality = stringSectionValue(answers);
      return;
    case 'familyMap':
      sections.familyMap = arraySectionValue(answers, ['familyMap', 'members', 'items']);
      return;
    case 'situationalReactions':
      sections.situationalReactions = arraySectionValue(answers, [
        'situationalReactions',
        'reactions',
        'items',
      ]);
      return;
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

function arraySectionValue(
  section: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): readonly unknown[] {
  return firstArrayField(section, keys);
}

function stringArraySectionValue(
  section: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): readonly string[] {
  return firstArrayField(section, keys).filter(
    (value): value is string => typeof value === 'string',
  );
}

function stringSectionValue(section: Readonly<Record<string, unknown>>): string {
  const direct = section.value ?? section.text ?? section.content ?? section.answer;
  if (typeof direct === 'string') {
    return direct;
  }
  return '';
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
