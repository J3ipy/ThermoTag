# ThermoTag SE

MVP de apoio à fiscalização de entregas de alimentos perecíveis da alimentação escolar em Sergipe. Cada carga recebe uma URL gravada na tag NFC; o responsável fotografa o indicador térmico e registra a leitura, inclusive sem conexão depois de abrir a aplicação uma vez online.

**Nova versão de demonstração:** https://thermotag-se-inovathon.pedrosant1905.chatgpt.site/ (acesso pela conta do projeto). A implantação em `https://thermotag-se.thermotag.workers.dev/` só receberá estas melhorias depois que você atualizar o seu repositório, aplicar as migrações e publicar novamente na sua conta Cloudflare.

> A tag NFC identifica a carga; ela não mede temperatura. A classificação por foto compara a cor amostrada com duas referências informadas no cadastro, que precisam ser validadas com o indicador físico escolhido. O protótipo não mede temperatura continuamente nem determina responsabilidade contratual.

## Funcionalidades

- Cadastro de cargas com produto, fornecedor/agricultor familiar, contrato/pedido, escola ou destino, código da tag, limiar e duas cores de referência.
- Check-ins com foto, seleção da área de cor na imagem e classificação de cor. Uma avaliação divergente ou inconclusiva exige justificativa; um alerta não pode voltar ao estado normal.
- Fila local de check-ins e fotos por IndexedDB para sincronização quando a página voltar a ter conexão. Horários de captura são do aparelho; o servidor registra a hora do recebimento.
- Histórico de fotos, cor analisada e justificativa em cada registro.
- GPS opcional com permissão do dispositivo; preenchimento manual de localidade como alternativa.
- Passaporte digital com histórico de leituras, alerta e intervalo entre o último registro normal e o primeiro alerta.
- Painel com cargas, leituras, ocorrências e mapa esquemático.
- Dados de demonstração identificados como simulados.

## Como funciona a etiqueta NFC

1. Cadastre uma carga em **Nova carga** e defina o código da etiqueta, por exemplo, `TT-SE-001`.
2. Em **Passaportes**, selecione a carga e copie ou grave a URL gerada: `https://thermotag-se.thermotag.workers.dev/?tag=TT-SE-001`.
3. Grave essa URL em uma **tag NFC NDEF gravável**, como um registro do tipo **URL**. A tag não precisa vir programada; o sistema gera o link após o cadastro, mas a gravação exige um celular ou aplicativo compatível.
4. Aproxime a tag do celular. O link abre o formulário com o código da carga preenchido.
5. Fotografe o indicador, toque na área colorida da foto, confira a classificação e confirme o check-in. **A aproximação da tag não salva um registro automaticamente.**

| Dispositivo | Leitura | Gravação |
| --- | --- | --- |
| Android com Chrome e NFC | Botão **Escanear etiqueta NFC** com Web NFC ou abertura da URL gravada | Botão **Gravar com Android** |
| iPhone compatível | Aproximar a tag com a tela acesa e tocar na notificação que abre a URL no Safari | Copiar a URL e usar um aplicativo de gravação NFC |

O Safari no iPhone não disponibiliza o leitor Web NFC dentro da página. A leitura da URL gravada na tag é feita pelo próprio iOS em aparelhos compatíveis, em geral iPhone XS ou posterior. Também é possível digitar o código da etiqueta manualmente. Use tags NDEF graváveis; durante os testes, não bloqueie a tag para gravação.

O código e o link da carga ficam na tag. Histórico, status, horários e localização ficam no D1; as fotos são armazenadas no R2. A etiqueta NFC e o indicador físico de temperatura são componentes diferentes.

## Demonstração rápida

Na aplicação, clique em **Carregar demonstração** para criar duas cargas fictícias. A primeira inclui uma ocorrência de alerta; a segunda permanece em trânsito. Abra **Passaportes** para consultar o histórico ou **Registrar leitura** para fazer um novo check-in de teste. Clicar novamente em **Carregar demonstração** não duplica essas cargas.

## Registro sem conexão

Abra a aplicação com internet ao menos uma vez no aparelho e cadastre uma carga antes de testar offline. Sem rede, mantenha a aba aberta, fotografe e registre; o contador de pendências aparece no topo. Ao voltar a ter internet, a página aberta sincroniza os registros em ordem ou você pode clicar em **Sincronizar agora**. O service worker tenta manter a página disponível para reabertura offline, mas o navegador pode eliminar seu armazenamento; no iPhone, se a tag não abrir a página sem rede, use uma aba já aberta ou digite o código. Não há sincronização garantida com o navegador fechado.

## Tecnologias

- **Interface:** TypeScript, React, componentes Base UI e CSS.
- **Aplicação web:** Vinext, Vite e Cloudflare Workers.
- **Persistência:** Cloudflare D1 (registros), R2 (fotos), IndexedDB (fila offline) e service worker (arquivos da página). Esquema em `db/schema.ts`.
- **NFC:** Web NFC quando disponível no navegador; URL NDEF para abertura pelo sistema do celular.

O projeto usa os vínculos `DB` e `BUCKET`, referenciado no código do servidor. As rotas principais são `GET /api/shipments`, `POST /api/shipments`, `POST /api/checkins` e `POST /api/demo`.

## Executar localmente

Requisitos: **Node.js 22.13.0 ou superior** e Corepack. O `package.json` fixa o pnpm na versão `11.25.0`. No terminal da pasta do projeto:

```powershell
corepack pnpm install
corepack pnpm build
corepack pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --file drizzle/0000_quick_harrier.sql
corepack pnpm dev
```

Abra o endereço exibido pelo terminal (normalmente `http://localhost:5173`). Antes do primeiro uso destas funções, execute também as migrações `drizzle/0001_square_ogun.sql` e `drizzle/0002_organic_molly_hayes.sql`, nessa ordem, com o mesmo comando local acima, alterando somente `--file`. Se o banco local já existia, execute apenas `0001` e `0002`; não repita `0000`.

No Windows, se `corepack enable` falhar por falta de permissão em `C:\Program Files\nodejs`, use `corepack pnpm` diretamente, como nos comandos acima. Para executar o build com o servidor local do Wrangler, use `corepack pnpm start` depois de aplicar o SQL.

## Publicar na própria conta Cloudflare

O projeto precisa de um Worker, banco D1 e bucket R2; uma hospedagem apenas de arquivos estáticos não executa as rotas da API.

1. Entre na sua conta e crie o banco:

   ```powershell
   corepack pnpm exec wrangler login
   corepack pnpm exec wrangler d1 create thermotag-se-db
   corepack pnpm exec wrangler r2 bucket create thermotag-evidence
   ```

2. Em `vite.config.ts`, no objeto `d1_databases`, configure `database_name: "thermotag-se-db"` e substitua `database_id` pelo ID retornado. No objeto `r2_buckets`, configure `bucket_name: "thermotag-evidence"`. Mantenha os vínculos `DB` e `BUCKET` de `.openai/hosting.json`.
3. Gere a aplicação, crie as tabelas no banco remoto e publique:

   ```powershell
   corepack pnpm build
   corepack pnpm exec wrangler d1 execute thermotag-se-db --remote --config dist/server/wrangler.json --file drizzle/0000_quick_harrier.sql
   corepack pnpm exec wrangler d1 execute thermotag-se-db --remote --config dist/server/wrangler.json --file drizzle/0001_square_ogun.sql
   corepack pnpm exec wrangler d1 execute thermotag-se-db --remote --config dist/server/wrangler.json --file drizzle/0002_organic_molly_hayes.sql
   corepack pnpm exec wrangler deploy --config dist/server/wrangler.json --name thermotag-se
   ```

Se o banco remoto já contém o MVP anterior, **não repita `0000`**: aplique somente `0001` e `0002`, nessa ordem, antes do deploy. Em banco novo, execute as três migrações uma única vez. Nas publicações seguintes, execute o build e o deploy. O Wrangler informa a URL `*.workers.dev`; novas tags devem usar a URL dessa implantação.

## Estado e limites do MVP

- O MVP **não tem autenticação própria** nas rotas nem proteção das fotos. Qualquer pessoa com a URL pode consultar cargas e fotos ou enviar registros. Use somente dados fictícios de teste; contratos reais exigem autenticação, permissões e política de retenção.
- A classificação usa a média de 11 × 11 pixels escolhidos na foto e limiares simples de distância entre cores. Luz, reflexos, balanço de branco e região escolhida podem alterar o resultado. Calibre e valide em amostras reais de cada indicador.
- O horário da captura offline depende do relógio do aparelho, e a foto pode ser alterada antes do envio. São evidências para o fiscal analisar, sem certificação pericial.
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
| `vite.config.ts` | Configuração do Worker, D1 e R2 |

Projeto desenvolvido como MVP do **Inovathon SE**.
