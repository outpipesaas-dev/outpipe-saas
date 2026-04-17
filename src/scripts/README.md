# Google Maps Scraper

Script para extração de leads diretamente do Google Maps.

## Requisitos

- Node.js
- Playwright
- Prisma (cliente gerado)

## Como usar (CLI)

Para rodar o script manualmente:

```bash
npx tsx src/scripts/google-maps-scraper.ts "termo de busca" "localização" 50
```

Exemplo:
```bash
npx tsx src/scripts/google-maps-scraper.ts "clínicas odontológicas" "São Paulo" 20
```

Os parâmetros são:
1. **Query**: O que você está buscando (ex: "academias")
2. **Location**: Localização (ex: "Curitiba")
3. **MaxResults**: Quantidade máxima de resultados (default: 10)

## Como usar (API)

Envie um POST para `/api/scraper/google-maps` com o corpo:

```json
{
  "query": "restaurantes",
  "location": "Rio de Janeiro",
  "maxResults": 30,
  "organizationId": "clm..." (opcional)
}
```

O scraping rodará em segundo plano (background) se disparado via API, respondendo imediatamente com status 202.

## Funcionamento

1. O script inicia uma instância do Chromium via Playwright.
2. Navega até a busca do Google Maps.
3. Faz scroll no feed de resultados até atingir a quantidade desejada.
4. Para cada item da lista:
   - Clica no item para carregar detalhes.
   - Extrai nome, website, telefone, endereço, rating, reviews e categorias.
   - Salva no banco de dados via Prisma na tabela `Lead`.
   - Verifica duplicatas por Nome + Endereço.
   - Aplica um delay aleatório entre as extrações para evitar bloqueios.

## Observações

- O script usa `headless: true` por padrão. Caso queira ver o navegador em ação durante o desenvolvimento, altere para `false` no arquivo `google-maps-scraper.ts`.
- O Google Maps pode alterar seus seletores CSS frequentemente. Caso o script pare de extrair dados, verifique os seletores no código.
