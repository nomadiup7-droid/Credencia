import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('SUPABASE_URL e SUPABASE_SECRET_KEY precisam estar configurados. Este script nunca usa db.json.');
  process.exit(1);
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
  console.warn('Usando SUPABASE_SERVICE_ROLE_KEY por compatibilidade legada. Prefira SUPABASE_SECRET_KEY.');
}

const rl = createInterface({ input, output });
const ask = async (question: string, fallback?: string) => {
  const value = (await rl.question(question)).trim();
  return value || fallback || '';
};

const validatePassword = (password: string) => {
  const failures = [];
  if (password.length < 12) failures.push('12 caracteres');
  if (!/[A-Z]/.test(password)) failures.push('letra maiuscula');
  if (!/[a-z]/.test(password)) failures.push('letra minuscula');
  if (!/[0-9]/.test(password)) failures.push('numero');
  if (!/[^A-Za-z0-9]/.test(password)) failures.push('caractere especial');
  return failures;
};

try {
  const name = await ask('Nome do administrador: ');
  const email = (await ask('E-mail do administrador: ')).toLowerCase();
  const organizationName = await ask('Nome da organizacao: ');
  const password = await ask('Senha forte (nao sera exibida no resultado): ');
  const pinInput = await ask('PIN seguro opcional (vazio para gerar): ');

  const failures = validatePassword(password);
  if (!name || !email || !organizationName) throw new Error('Nome, e-mail e organizacao sao obrigatorios.');
  if (failures.length > 0) throw new Error('Senha fraca. Requisitos pendentes: ' + failures.join(', '));

  const pin = pinInput || String(randomBytes(3).readUIntBE(0, 3)).padStart(6, '0').slice(0, 6);
  if (!/^\d{6,}$/.test(pin)) throw new Error('PIN deve ter pelo menos 6 digitos numericos.');

  const supabase = createClient(supabaseUrl, supabaseSecretKey, { auth: { persistSession: false } });
  const { data: existingUser, error: existingError } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
  if (existingError) throw existingError;
  if (existingUser) throw new Error('Ja existe usuario com este e-mail.');

  const orgId = 'org_' + randomBytes(8).toString('hex');
  const userId = 'u_' + randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  const { error: orgError } = await supabase.from('organizations').insert({ id: orgId, name: organizationName, created_at: now });
  if (orgError) throw orgError;

  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    name,
    email,
    role: 'ADMIN',
    password_hash: passwordHash,
    pin,
    organization_id: orgId,
    permissions: [],
    created_at: now
  });
  if (userError) throw userError;

  console.log('Administrador criado com sucesso.');
  console.log('Organizacao:', organizationName, '(' + orgId + ')');
  console.log('Usuario:', name, '<' + email + '>');
  console.log('PIN:', pin);
  console.log('A senha nao foi impressa. Guarde-a em local seguro.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha ao criar administrador.');
  process.exitCode = 1;
} finally {
  rl.close();
}
