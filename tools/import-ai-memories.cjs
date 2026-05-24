#!/usr/bin/env node

const { execFileSync } = require('child_process');

const DEFAULT_SOURCE_URL =
  'https://api.github.com/repos/MediLux-TalkTo/TalkTo_PersonaAI_AI/contents/backend_memory/memory_import.json?ref=main';

const sourceUrl = process.env.MEMORY_IMPORT_SOURCE_URL || DEFAULT_SOURCE_URL;
const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
const adminEmail = process.env.ADMIN_EMAIL || 'admin@talkto.local';
const adminPassword = process.env.ADMIN_PASSWORD;
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || readGhToken();
const dryRun = process.env.IMPORT_DRY_RUN === 'true';

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  if (!adminPassword && !dryRun) {
    throw new Error('ADMIN_PASSWORD is required unless IMPORT_DRY_RUN=true.');
  }

  const memories = await loadMemories();
  validateMemories(memories);

  console.log(`Loaded ${memories.length} memories from AI repo data source.`);

  if (dryRun) {
    console.log('Dry run enabled. No backend writes were performed.');
    return;
  }

  const accessToken = await login();
  const existingMemories = await loadExistingMemories(accessToken);
  let created = 0;
  let updated = 0;

  for (const memory of memories) {
    const existingMemory = findExistingMemory(existingMemories, memory);
    const importPayload = toBackendImportPayload(memory);

    if (existingMemory) {
      await updateMemory(accessToken, existingMemory.id, importPayload);
      updated += 1;
      continue;
    }

    await createMemory(accessToken, importPayload);
    created += 1;
  }

  console.log(`Import complete. created=${created} updated=${updated}`);
}

async function loadMemories() {
  const headers = {
    accept: 'application/vnd.github+json, application/json',
  };

  if (githubToken) {
    headers.authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(sourceUrl, { headers });

  if (!response.ok) {
    throw new Error(`Failed to load memory import source: ${response.status}.`);
  }

  const payload = await response.json();

  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload.content === 'string' && payload.encoding === 'base64') {
    return JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
  }

  throw new Error('Unsupported memory import source response shape.');
}

function validateMemories(memories) {
  if (!Array.isArray(memories)) {
    throw new Error('Memory import payload must be an array.');
  }

  for (const [index, memory] of memories.entries()) {
    const missing = ['title', 'memoryType', 'bodyMarkdown'].filter(
      (key) => typeof memory[key] !== 'string' || memory[key].trim() === '',
    );

    if (missing.length > 0) {
      throw new Error(
        `Memory item ${index} is missing required fields: ${missing.join(', ')}.`,
      );
    }

    if (!Array.isArray(memory.tags)) {
      throw new Error(`Memory item ${index} must include tags array.`);
    }

    if (memory.memoryType !== 'LONG_TERM') {
      throw new Error(`Memory item ${index} must use memoryType LONG_TERM.`);
    }
  }
}

async function login() {
  const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identifier: adminEmail,
      password: adminPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend admin login failed: ${response.status}.`);
  }

  const envelope = await response.json();
  const accessToken = envelope?.data?.accessToken;

  if (!accessToken) {
    throw new Error('Backend login response did not include accessToken.');
  }

  return accessToken;
}

async function loadExistingMemories(accessToken) {
  const response = await fetch(`${backendUrl}/api/v1/memories?status=ACTIVE`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list existing memories: ${response.status}.`);
  }

  const envelope = await response.json();
  return Array.isArray(envelope?.data) ? envelope.data : [];
}

function findExistingMemory(existingMemories, importMemory) {
  const legacyTag = importMemory.tags.find((tag) => tag.startsWith('legacy_id:'));

  if (legacyTag) {
    const legacyMatch = existingMemories.find((memory) =>
      (memory.tags || []).includes(legacyTag),
    );

    if (legacyMatch) {
      return legacyMatch;
    }
  }

  return existingMemories.find(
    (memory) =>
      memory.title === importMemory.title &&
      memory.memoryType === importMemory.memoryType,
  );
}

function toBackendImportPayload(memory) {
  return {
    title: memory.title,
    memoryType: memory.memoryType,
    relatedPeople: memory.relatedPeople ?? [],
    relatedPeriod: memory.relatedPeriod ?? null,
    bodyMarkdown: memory.bodyMarkdown,
    tags: memory.tags ?? [],
  };
}

async function createMemory(accessToken, memory) {
  const response = await fetch(`${backendUrl}/api/v1/memories`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(memory),
  });

  if (!response.ok) {
    throw new Error(`Failed to create memory "${memory.title}": ${response.status}.`);
  }
}

async function updateMemory(accessToken, memoryId, memory) {
  const response = await fetch(`${backendUrl}/api/v1/memories/${memoryId}`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(memory),
  });

  if (!response.ok) {
    throw new Error(`Failed to update memory "${memory.title}": ${response.status}.`);
  }
}

function readGhToken() {
  try {
    return execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}
