#!/usr/bin/env node
/**
 * switch-env.js - Alternar entre ambientes de Teste e Produção
 * 
 * Este script permite alternar entre a base de dados de teste e produção,
 * criando e fazendo seed da BD de teste automaticamente na primeira vez.
 * 
 * Uso: node scripts/switch-env.js [teste|producao|status]
 * 
 * Exemplos:
 *   node scripts/switch-env.js teste      - Mudar para ambiente de teste
 *   node scripts/switch-env.js producao  - Mudar para ambiente de produção
 *   node scripts/switch-env.js status    - Mostrar ambiente atual
 *   node scripts/switch-env.js           - Alternar automaticamente
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const ENV_FILE = join(ROOT, 'apps', 'web', '.env');
const ENV_BACKUP = join(ROOT, 'apps', 'web', '.env.backup');

// Configurações dos ambientes
const ENVIRONMENTS = {
  teste: {
    database: {
      host: 'localhost',
      port: 3306,
      user: process.env.DB_TEST_USER || 'baselandia_test',
      password: process.env.DB_TEST_PASSWORD || 'password_test',
      name: 'baselandia_test',
    },
    url: process.env.TEST_URL || 'https://teste.baselandia.pt',
    description: 'Ambiente de Teste',
  },
  producao: {
    database: {
      host: 'localhost',
      port: 3306,
      user: process.env.DB_PROD_USER || 'baselandia_prod',
      password: process.env.DB_PROD_PASSWORD || 'password_prod',
      name: 'baselandia_prod',
    },
    url: process.env.PROD_URL || 'https://baselandia.pt',
    description: 'Ambiente de Produção',
  },
};

/**
 * Lê o arquivo .env atual
 */
function readEnv() {
  if (!existsSync(ENV_FILE)) {
    console.error('❌ Arquivo .env não encontrado:', ENV_FILE);
    process.exit(1);
  }
  
  const content = readFileSync(ENV_FILE, 'utf-8');
  const env = {};
  
  for (const line of content.split('\n')) {
    const match = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      // Remover aspas se existirem
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value;
    }
  }
  
  return env;
}

/**
 * Escreve o arquivo .env
 */
function writeEnv(env) {
  const lines = Object.entries(env)
    .map(([key, value]) => {
      // Adicionar aspas se o valor contiver espaços ou caracteres especiais
      if (value.includes(' ') || value.includes('"') || value.includes("'")) {
        return `${key}="${value}"`;
      }
      return `${key}=${value}`;
    })
    .join('\n');
  
  writeFileSync(ENV_FILE, lines + '\n');
}

/**
 * Detecta o ambiente atual baseado no DATABASE_URL
 */
function detectCurrentEnv(env) {
  const dbUrl = env.DATABASE_URL || '';
  
  if (dbUrl.includes('baselandia_test')) {
    return 'teste';
  } else if (dbUrl.includes('baselandia_prod')) {
    return 'producao';
  }
  
  return 'desconhecido';
}

/**
 * Gera a DATABASE_URL para um ambiente
 */
function generateDatabaseUrl(env, config) {
  const { database } = config;
  return `mysql://${database.user}:${database.password}@${database.host}:${database.port}/${database.name}`;
}

/**
 * Faz backup do .env atual
 */
function backupEnv() {
  if (existsSync(ENV_FILE)) {
    const content = readFileSync(ENV_FILE, 'utf-8');
    writeFileSync(ENV_BACKUP, content);
    console.log('✅ Backup criado:', ENV_BACKUP);
  }
}

/**
 * Restaura o backup do .env
 */
function restoreBackup() {
  if (existsSync(ENV_BACKUP)) {
    const content = readFileSync(ENV_BACKUP, 'utf-8');
    writeFileSync(ENV_FILE, content);
    console.log('✅ Backup restaurado');
    return true;
  }
  return false;
}

/**
 * Verifica se a base de dados de teste existe
 */
async function checkTestDatabase() {
  try {
    // Tenta conectar à BD de teste
    const testConfig = ENVIRONMENTS.teste;
    const testUrl = generateDatabaseUrl('teste', testConfig);
    
    // Usar mysql2 para verificar conexão
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection(testUrl);
    await connection.ping();
    await connection.end();
    
    return true;
  } catch (error) {
    console.log('⚠️  Base de dados de teste não acessível:', error.message);
    return false;
  }
}

/**
 * Cria a base de dados de teste
 */
async function createTestDatabase() {
  try {
    const testConfig = ENVIRONMENTS.teste;
    
    // Conectar sem especificar a BD para criar a BD
    const adminUrl = `mysql://${testConfig.database.user}:${testConfig.database.password}@${testConfig.database.host}:${testConfig.database.port}`;
    
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection(adminUrl);
    
    // Criar a BD se não existir
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${testConfig.database.name}\``);
    console.log('✅ Base de dados de teste criada:', testConfig.database.name);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar base de dados de teste:', error.message);
    return false;
  }
}

/**
 * Faz push do schema para a BD
 */
function pushSchema() {
  try {
    console.log('📋 A fazer push do schema...');
    execSync('npm run db:push', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log('✅ Schema criado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao fazer push do schema:', error.message);
    return false;
  }
}

/**
 * Faz seed da BD de teste
 */
function seedTestDatabase() {
  try {
    console.log('🌱 A fazer seed da base de dados de teste...');
    
    // Tentar usar o seed-simple.js
    const seedPath = join(ROOT, 'packages', 'db', 'prisma', 'seed-simple.js');
    if (existsSync(seedPath)) {
      execSync(`node "${seedPath}"`, {
        cwd: ROOT,
        stdio: 'inherit',
      });
    } else {
      // Fallback para o seed normal
      execSync('npm run db:seed:dev', {
        cwd: ROOT,
        stdio: 'inherit',
      });
    }
    
    console.log('✅ Seed concluído com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error.message);
    return false;
  }
}

/**
 * Mostra o status atual
 */
function showStatus(env) {
  const currentEnv = detectCurrentEnv(env);
  const config = ENVIRONMENTS[currentEnv];
  
  console.log('\n📊 Status Atual:');
  console.log('═══════════════════════════════════════');
  console.log(`Ambiente: ${config?.description || 'Desconhecido'}`);
  console.log(`Database: ${env.DATABASE_URL?.split('@')[1] || 'Não configurada'}`);
  console.log(`App URL: ${env.NEXT_PUBLIC_APP_URL || 'Não configurada'}`);
  console.log('═══════════════════════════════════════\n');
}

/**
 * Alterna para um ambiente específico
 */
async function switchEnvironment(targetEnv) {
  console.log(`\n🔄 A mudar para ambiente: ${targetEnv.toUpperCase()}\n`);
  
  // Ler .env atual
  const env = readEnv();
  
  // Fazer backup
  backupEnv();
  
  // Obter configuração do ambiente alvo
  const config = ENVIRONMENTS[targetEnv];
  if (!config) {
    console.error(`❌ Ambiente inválido: ${targetEnv}`);
    process.exit(1);
  }
  
  // Atualizar variáveis de ambiente
  env.DATABASE_URL = generateDatabaseUrl(targetEnv, config);
  env.NEXT_PUBLIC_APP_URL = config.url;
  env.BETTER_AUTH_URL = config.url;
  
  // Escrever novo .env
  writeEnv(env);
  console.log(`✅ .env atualizado para ${config.description}`);
  
  // Se for ambiente de teste, verificar/criar BD e fazer seed
  if (targetEnv === 'teste') {
    console.log('\n🧪 Configurando ambiente de teste...');
    
    const dbExists = await checkTestDatabase();
    
    if (!dbExists) {
      console.log('📝 Base de dados de teste não existe. A criar...');
      const created = await createTestDatabase();
      
      if (!created) {
        console.error('❌ Não foi possível criar a base de dados de teste');
        console.log('🔄 Restaurando backup...');
        restoreBackup();
        process.exit(1);
      }
    }
    
    // Fazer push do schema
    const pushed = pushSchema();
    if (!pushed) {
      console.error('❌ Não foi possível criar o schema');
      console.log('🔄 Restaurando backup...');
      restoreBackup();
      process.exit(1);
    }
    
    // Fazer seed
    const seeded = seedTestDatabase();
    if (!seeded) {
      console.warn('⚠️  Seed falhou, mas o ambiente está configurado');
    }
  }
  
  console.log('\n✅ Ambiente configurado com sucesso!');
  console.log(`📋 Pronto para usar: ${config.description}`);
  console.log(`🌐 URL: ${config.url}`);
  console.log('\n💡 Reinicia a aplicação no cPanel para aplicar as mudanças.\n');
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  // Ler .env atual
  const env = existsSync(ENV_FILE) ? readEnv() : {};
  
  // Comandos disponíveis
  if (command === 'status' || command === 'st') {
    showStatus(env);
    return;
  }
  
  if (command === 'teste' || command === 'test') {
    await switchEnvironment('teste');
    return;
  }
  
  if (command === 'producao' || command === 'prod' || command === 'production') {
    await switchEnvironment('producao');
    return;
  }
  
  if (command === 'backup') {
    backupEnv();
    return;
  }
  
  if (command === 'restore') {
    if (restoreBackup()) {
      console.log('✅ Backup restaurado. Reinicia a aplicação.');
    } else {
      console.log('❌ Nenhum backup encontrado');
    }
    return;
  }
  
  // Sem comando: alternar automaticamente
  const currentEnv = detectCurrentEnv(env);
  const targetEnv = currentEnv === 'teste' ? 'producao' : 'teste';
  
  console.log(`🔄 Alternando: ${currentEnv.toUpperCase()} → ${targetEnv.toUpperCase()}`);
  await switchEnvironment(targetEnv);
}

// Executar
main().catch((error) => {
  console.error('❌ Erro:', error);
  process.exit(1);
});