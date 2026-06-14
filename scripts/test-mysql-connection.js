/**
 * Script para testar conexão com MySQL local (XAMPP)
 * e criar a base de dados baselandia_test
 */

import mysql from "mysql2/promise";

// Configurações do MySQL (XAMPP padrão)
const config = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
};

const DB_NAME = "baselandia_test";

async function testConnection() {
  console.log("🔍 A testar conexão com MySQL...");
  console.log("Configurações:", {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password ? "***" : "(vazio)",
  });

  try {
    // Primeiro, conectar sem especificar base de dados
    const connection = await mysql.createConnection(config);
    console.log("✅ Conexão estabelecida com sucesso!\n");

    // Verificar se a base de dados já existe
    const [databases] = await connection.query("SHOW DATABASES LIKE ?", [DB_NAME]);

    if (databases.length > 0) {
      console.log(`📊 A base de dados "${DB_NAME}" já existe.`);
    } else {
      console.log(`📦 A criar base de dados "${DB_NAME}"...`);

      // Criar base de dados
      await connection.query(`CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ Base de dados "${DB_NAME}" criada com sucesso!`);
    }

    // Listar todas as bases de dados
    const [allDatabases] = await connection.query("SHOW DATABASES");
    console.log("\n📋 Bases de dados disponíveis:");
    allDatabases.forEach((db) => {
      console.log(`   - ${db.Database}`);
    });

    // Testar conexão com a base de dados criada
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`\n✅ Conectado à base de dados "${DB_NAME}"`);

    // Criar uma tabela de teste
    await connection.query(`
      CREATE TABLE IF NOT EXISTS teste_conexao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mensagem VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Tabela de teste criada");

    // Inserir um registo de teste
    await connection.query("INSERT INTO teste_conexao (mensagem) VALUES (?)", ["Conexão bem-sucedida!"]);
    console.log("✅ Registo de teste inserido");

    // Ler o registo
    const [rows] = await connection.query("SELECT * FROM teste_conexao");
    console.log("\n📄 Registros na tabela de teste:", rows);

    // Limpar
    await connection.query("DROP TABLE teste_conexao");
    await connection.end();

    console.log("\n🎉 Teste concluído com sucesso!");
    console.log(`\n✨ A base de dados "${DB_NAME}" está pronta para uso.`);
    console.log(`\n📝 Configuração recomendada para .env:`);
    console.log(`DB_HOST="${config.host}"`);
    console.log(`DB_PORT="${config.port}"`);
    console.log(`DB_USERNAME="${config.user}"`);
    console.log(`DB_PASSWORD="${config.password}"`);
    console.log(`DB_NAME="${DB_NAME}"`);
  } catch (error) {
    console.error("\n❌ Erro ao conectar ao MySQL:");
    console.error("   Código:", error.code);
    console.error("   Mensagem:", error.message);
    console.error("\n💡 Possíveis soluções:");

    if (error.code === "ECONNREFUSED") {
      console.log("   1. Verifique se o XAMPP está a correr");
      console.log("   2. Verifique se o serviço MySQL está iniciado no XAMPP Control Panel");
      console.log("   3. Verifique se a porta 3306 não está bloqueada");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("   1. Verifique o username e password do MySQL");
      console.log("   2. No XAMPP padrão: username=root, password=(vazio)");
    } else if (error.code === "ETIMEDOUT") {
      console.log("   1. Verifique se o firewall não está a bloquear a conexão");
      console.log('   2. Tente usar "localhost" em vez de "127.0.0.1"');
    }

    process.exit(1);
  }
}

// Executar o teste
testConnection();
