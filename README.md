# ThermoTag SE — MVP

Protótipo para rastrear cargas sensíveis à temperatura em Sergipe. Contém cadastro de carga, gravação e leitura NFC no Chrome para Android, abertura de URL NFC no iPhone, check-in por código manual, geolocalização opcional, painel de ocorrências e passaporte digital. Os dados são persistidos em Cloudflare D1.

## Demonstração

1. Clique em **Carregar demonstração**. O cenário simulado cria duas cargas: `SE-02931` (Estância → Aracaju, com alerta entre Itaporanga d'Ajuda e São Cristóvão) e `SE-02932` (Lagarto → Aracaju, em trânsito).
2. Abra **Passaportes** para mostrar o intervalo entre o último check-in normal e o primeiro alerta.
3. Abra **Registrar leitura** e escolha `TT-SE-02932` para fazer um novo check-in da carga em trânsito. Use a condição visual desejada e um nome de operador de demonstração.
4. Para cadastrar uma carga própria, clique em **Nova carga** e informe o código da etiqueta, o produto, a origem, o destino e o limiar do indicador físico. No passaporte, use **Gravar com Android** para escrever a URL na tag ou **Copiar URL** para usar um aplicativo de gravação NFC no iPhone. Depois aproxime a tag para abrir o check-in.

Os registros simulados são identificados como demonstração. O botão é idempotente; não cria cópias a cada clique.

## Etiqueta NFC

Compre uma tag NFC gravável compatível com NDEF. O fluxo foi pensado para uma NTAG213 ou NTAG215. Depois de cadastrar a carga, o sistema prepara uma URL HTTPS com o código público da etiqueta, como `https://.../?tag=TT-SE-0001`. Não grave nome do operador, localização, status térmico ou informações sensíveis na tag: os registros ficam no banco de dados.

No Android com Chrome e NFC ativado, **Gravar com Android** escreve essa URL como registro NDEF do tipo URL na tag aproximada. A gravação substitui o conteúdo anterior da tag; não a torne somente leitura durante o piloto. O botão **Escanear etiqueta NFC** também lê registros NDEF de URL ou texto, e o código impresso é a alternativa manual.

No iPhone, o navegador não oferece Web NFC para o botão de leitura/gravação. Para o teste, use **Copiar URL** e grave a tag como registro NDEF URL por um aplicativo gravador NFC. Ao aproximar um iPhone compatível da tag com a tela ativa, o sistema pode apresentar a URL para abrir no Safari; a página reconhece `?tag=...` e prepara o formulário de check-in. O usuário precisa ter acesso ao Site privado. O check-in exige confirmação visual do indicador e envio explícito; aproximar a tag por si só não registra nada.

O operador informa **íntegro** ou **ativado**. O app impede que um alerta volte ao estado normal em check-ins posteriores, porque a mudança física proposta é irreversível. Hora é registrada no servidor. O GPS depende da permissão do usuário; sem ela, o local informado permanece identificado como manual. Para cidades conhecidas, o mapa usa o centro aproximado da cidade informada. A linha liga check-ins, não representa a rota real percorrida.

## Limite do protótipo

A aplicação está funcional, mas a integração de uma etiqueta termocrômica irreversível ainda depende da seleção, calibração e teste físico de um indicador apropriado à faixa térmica de cada produto. O sistema não substitui sensor contínuo, data logger, laudo de temperatura ou uma política de descarte. Não atribui culpa com base apenas no intervalo entre check-ins.

A versão publicada é privada. Para um piloto com vários operadores, é necessário definir o acesso de cada pessoa e validar os procedimentos de recebimento e auditoria.

## Desenvolvimento local

Requer Node.js 22+. Instale as dependências com `npm install`, gere a migração com `npm run db:generate`, construa com `npm run build`, aplique o SQL de `drizzle/` ao D1 local e inicie com `npm run dev`. A configuração da instância hospedada fica em `.openai/hosting.json`.
