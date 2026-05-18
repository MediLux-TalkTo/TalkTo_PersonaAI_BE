describe('Persona AI API e2e skeleton', () => {
  it('documents the critical MVP flows that require BE and DB servers', () => {
    expect([
      'auth login',
      'memory import',
      'text conversation',
      'voice conversation',
      'feedback',
      'admin metrics',
    ]).toContain('voice conversation');
  });
});
