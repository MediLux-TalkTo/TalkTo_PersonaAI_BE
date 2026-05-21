type ApiEnvelope<T> = {
  data: T;
};

type LoginResponse = {
  accessToken: string;
};

type PersonaResponse = {
  id: string;
};

type ConversationResponse = {
  id: string;
};

type TextMessageResponse = {
  assistantMessage: {
    content: string;
    retrievedMemoryIds: string[];
  };
};

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/+$/, '');
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

const deployedE2e = baseUrl ? describe : describe.skip;
const authenticatedE2e =
  baseUrl && adminEmail && adminPassword ? describe : describe.skip;
const chatE2e =
  baseUrl &&
  adminEmail &&
  adminPassword &&
  process.env.E2E_CHAT_SMOKE === 'true'
    ? describe
    : describe.skip;

jest.setTimeout(90_000);

describe('Persona AI deployed API smoke', () => {
  deployedE2e('health', () => {
    it('reports an available database', async () => {
      const response = await fetch(`${baseUrl}/api/v1/health`);
      const health = (await response.json()) as {
        status: string;
        database: string;
      };

      expect(response.ok).toBe(true);
      expect(health.status).toBe('ok');
      expect(health.database).toBe('up');
    });
  });

  authenticatedE2e('authenticated MVP flows', () => {
    let accessToken: string;
    let personaId: string;

    beforeAll(async () => {
      const login = await request<ApiEnvelope<LoginResponse>>('/api/v1/auth/login', {
        method: 'POST',
        body: {
          identifier: adminEmail,
          password: adminPassword,
        },
      });

      accessToken = login.data.accessToken;
    });

    it('loads the active persona and imported long-term memories', async () => {
      const [persona, memories] = await Promise.all([
        request<ApiEnvelope<PersonaResponse>>('/api/v1/personas/active', {
          accessToken,
        }),
        request<ApiEnvelope<Array<{ id: string }>>>('/api/v1/memories?status=ACTIVE', {
          accessToken,
        }),
      ]);

      personaId = persona.data.id;

      expect(personaId).toBeTruthy();
      expect(memories.data.length).toBeGreaterThanOrEqual(44);
    });

  });

  chatE2e('chat flow', () => {
    let accessToken: string;
    let personaId: string;

    beforeAll(async () => {
      const login = await request<ApiEnvelope<LoginResponse>>('/api/v1/auth/login', {
        method: 'POST',
        body: {
          identifier: adminEmail,
          password: adminPassword,
        },
      });
      const persona = await request<ApiEnvelope<PersonaResponse>>(
        '/api/v1/personas/active',
        {
          accessToken: login.data.accessToken,
        },
      );

      accessToken = login.data.accessToken;
      personaId = persona.data.id;
    });

    it('creates a text conversation and receives an assistant reply', async () => {
      const conversation = await request<ApiEnvelope<ConversationResponse>>(
        '/api/v1/conversations',
        {
          accessToken,
          method: 'POST',
          body: {
            personaId,
            channel: 'TEXT',
            title: 'deployed e2e smoke',
          },
        },
      );

      const reply = await request<ApiEnvelope<TextMessageResponse>>(
        `/api/v1/conversations/${conversation.data.id}/messages/text`,
        {
          accessToken,
          method: 'POST',
          body: {
            content: '할머니 불고기 어떻게 해요?',
          },
        },
      );

      expect(reply.data.assistantMessage.content).toBeTruthy();
      expect(reply.data.assistantMessage.retrievedMemoryIds.length).toBeGreaterThan(0);
    });
  });
});

async function request<T>(
  path: string,
  options: {
    accessToken?: string;
    body?: Record<string, unknown>;
    method?: 'GET' | 'POST';
  } = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.accessToken
        ? { authorization: `Bearer ${options.accessToken}` }
        : {}),
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
