import { buildDataSourceOptions, buildTypeOrmOptions } from './typeorm.config';

describe('typeorm config', () => {
  const previousDbSsl = process.env.DB_SSL;

  afterEach(() => {
    if (previousDbSsl === undefined) {
      delete process.env.DB_SSL;
      return;
    }

    process.env.DB_SSL = previousDbSsl;
  });

  it('enables database SSL for managed Postgres when DB_SSL is true', () => {
    process.env.DB_SSL = 'true';

    expect(buildDataSourceOptions().ssl).toBe(true);
    expect(buildTypeOrmOptions().ssl).toBe(true);
  });
});
