// Garante que o segredo do JWT sempre venha de uma variável de ambiente real —
// nunca de um valor padrão previsível. Falhar alto (erro ao iniciar o servidor)
// é muito mais seguro do que assinar/validar tokens com um segredo adivinhável.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET não está definido. Configure essa variável de ambiente antes de iniciar o servidor.'
    );
  }
  return secret;
}
