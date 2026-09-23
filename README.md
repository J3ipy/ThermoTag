# ThermoTag SE

MVP de rastreabilidade de cargas sensíveis à temperatura. Cada carga recebe um código de etiqueta e uma URL que pode ser gravada em uma tag NFC. Ao abrir essa URL, o operador identifica a carga, confere visualmente o indicador térmico e registra um check-in com etapa, local, responsável e horário.

**Aplicação:** https://thermotag-se.thermotag.workers.dev/

> A tag NFC identifica a carga; ela não mede temperatura. O estado térmico é informado pelo operador após inspeção visual de um indicador físico. O projeto é um protótipo para validação, não um sistema de medição contínua.

## Funcionalidades

- Cadastro de cargas com produto, origem, destino, código da etiqueta e limiar do indicador.
- Check-ins de expedição, checkpoint e recebimento, com horário registrado no servidor.
- Condição visual **íntegra** ou **indicador ativado**; um alerta registrado não pode voltar ao estado normal.
- GPS opcional com permissão do dispositivo; preenchimento manual de localidade como alternativa.
- Passaporte digital com histórico de leituras, alerta e intervalo entre o último registro normal e o primeiro alerta.
- Painel com cargas, leituras, ocorrências e mapa esquemático.
- Dados de demonstração identificados como simulados.

## Como funciona a etiqueta NFC

1. Cadastre uma carga em **Nova carga** e defina o código da etiqueta, por exemplo, `TT-SE-001`.
2. Em **Passaportes**, selecione a carga e copie ou grave a URL gerada: `https://thermotag-se.thermotag.workers.dev/?tag=TT-SE-001`.
3. Grave essa URL em uma **tag NFC NDEF gravável**, como um registro do tipo **URL**. A tag não precisa vir programada; o sistema gera o link após o cadastro, mas a gravação exige um celular ou aplicativo compatível.
4. Aproxime a tag do celular. O link abre o formulário com o código da carga preenchido.
5. Confira o indicador físico, preencha os dados e confirme o check-in. **A aproximação da tag não salva um registro automaticamente.**

| Dispositivo | Leitura | Gravação |
| --- | --- | --- |
| Android com Chrome e NFC | Botão **Escanear etiqueta NFC** com Web NFC ou abertura da URL gravada | Botão **Gravar com Android** |
| iPhone compatível | Aproximar a tag com a tela acesa e tocar na notificação que abre a URL no Safari | Copiar a URL e usar um aplicativo de gravação NFC |

O Safari no iPhone não disponibiliza o leitor Web NFC dentro da página. A leitura da URL gravada na tag é feita pelo próprio iOS em aparelhos compatíveis, em geral iPhone XS ou posterior. Também é possível digitar o código da etiqueta manualmente. Use tags NDEF graváveis; durante os testes, não bloqueie a tag para gravação.

O código e o link da carga ficam na tag. Histórico, status, horário e localização ficam no banco D1. A etiqueta NFC e o indicador físico de temperatura são componentes diferentes.

## Demonstração rápida

Na aplicação, clique em **Carregar demonstração** para criar duas cargas fictícias. A primeira inclui uma ocorrência de alerta; a segunda permanece em trânsito. Abra **Passaportes** para consultar o histórico ou **Registrar leitura** para fazer um novo check-in de teste. Clicar novamente em **Carregar demonstração** não duplica essas cargas.

## Tecnologias

- **Interface:** TypeScript, React, componentes Base UI e CSS.
- **Aplicação web:** Vinext, Vite e Cloudflare Workers.
- **Persistência:** Cloudflare D1 (SQLite); esquema em `db/schema.ts` e SQL inicial em `drizzle/0000_quick_harrier.sql`.
- **NFC:** Web NFC quando disponível no navegador; URL NDEF para abertura pelo sistema do celular.

O projeto usa o vínculo D1 chamado `DB`, referenciado no código do servidor. As rotas principais são `GET /api/shipments`, `POST /api/shipments`, `POST /api/checkins` e `POST /api/demo`.

## Executar localmente

Requisitos: **Node.js 22.13.0 ou superior** e Corepack. O `package.json` fixa o pnpm na versão `11.25.0`. No terminal da pasta do projeto:

```powershell
corepack pnpm install
corepack pnpm build
corepack pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --file drizzle/0000_quick_harrier.sql
corepack pnpm dev
```

Abra o endereço exibido pelo terminal (normalmente `http://localhost:5173`). A importação do SQL é necessária **uma vez por banco local**. Os dados locais ficam em `.wrangler/state` e são separados dos dados publicados.

No Windows, se `corepack enable` falhar por falta de permissão em `C:\Program Files\nodejs`, use `corepack pnpm` diretamente, como nos comandos acima. Para executar o build com o servidor local do Wrangler, use `corepack pnpm start` depois de aplicar o SQL.

## Publicar na própria conta Cloudflare

O projeto precisa de um Worker e de um banco D1; uma hospedagem apenas de arquivos estáticos não executa as rotas da API.

1. Entre na sua conta e crie o banco:

   ```powershell
   corepack pnpm exec wrangler login
   corepack pnpm exec wrangler d1 create thermotag-se-db
   ```

2. Em `vite.config.ts`, no objeto `d1_databases`, configure `database_name: "thermotag-se-db"` e substitua `database_id` pelo ID retornado. **Mantenha `binding: d1`**, pois `.openai/hosting.json` define `d1` como `DB`.
3. Gere a aplicação, crie as tabelas no banco remoto e publique:

   ```powershell
   corepack pnpm build
   corepack pnpm exec wrangler d1 execute thermotag-se-db --remote --config dist/server/wrangler.json --file drizzle/0000_quick_harrier.sql
   corepack pnpm exec wrangler deploy --config dist/server/wrangler.json --name thermotag-se
   ```

A importação do SQL remoto é feita **somente na primeira publicação desse banco**. Nas publicações seguintes, execute o build e o deploy. O Wrangler informa a URL `*.workers.dev`; novas tags devem usar a URL dessa implantação.

## Estado e limites do MVP

- A versão publicada **não tem autenticação própria** nas rotas da API. Qualquer pessoa com acesso à URL pode consultar cargas e enviar novos registros. Use apenas dados fictícios até adicionar controle de acesso.
- O GPS depende das permissões do navegador. Sem GPS, o operador pode informar a localidade; o mapa usa o centro aproximado de cidades conhecidas. As linhas no mapa não representam a rota real percorrida.
- O indicador térmico físico ainda precisa ser selecionado e validado para cada faixa de temperatura. O software não lê a temperatura da tag e não substitui um sensor ou data logger.
- Leituras no iPhone abrem um link gravado na tag. Um leitor NFC iniciado por botão dentro do Safari exigiria uma capacidade que o navegador não oferece.

## Estrutura principal

| Caminho | Conteúdo |
| --- | --- |
| `app/page.tsx` | Interface, fluxo de NFC e check-in |
| `app/api/` | Rotas HTTP |
| `app/globals.css` | Estilos da interface |
| `lib/` | Modelo e acesso ao D1 |
| `db/` e `drizzle/` | Esquema e SQL inicial |
| `vite.config.ts` | Configuração do Worker e do vínculo D1 |

Projeto desenvolvido como MVP do **Inovathon SE**.
