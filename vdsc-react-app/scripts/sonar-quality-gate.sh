#!/bin/bash

# Script para executar testes e análise SonarQube do projeto fe-video-slice

set -e

echo "================================"
echo "fe-video-slice - Quality Gate"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "vdsc-react-app/package.json" ]; then
    echo -e "${RED}Erro: Execute este script da raiz do projeto${NC}"
    exit 1
fi

cd vdsc-react-app

# 1. Instalar dependências
echo -e "${YELLOW}1. Instalando dependências...${NC}"
npm install --legacy-peer-deps

# 2. Executar linter (opcional, se configurado)
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
    echo -e "${YELLOW}2. Executando ESLint...${NC}"
    npm run lint 2>/dev/null || echo "ESLint não configurado"
fi

# 3. Executar testes com cobertura
echo -e "${YELLOW}3. Executando testes com cobertura...${NC}"
npm run test:ci

# 4. Verificar se o coverage foi gerado
if [ ! -f "coverage/lcov.info" ]; then
    echo -e "${RED}Erro: Cobertura de testes não foi gerada${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Cobertura de testes gerada com sucesso${NC}"

# 5. Verificar se o arquivo de resultados de testes foi gerado
if [ ! -f "test-results.xml" ]; then
    echo -e "${RED}Erro: Arquivo de resultados de testes não foi gerado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Resultados de testes gerados com sucesso${NC}"

# 6. Executar SonarScanner
echo ""
echo -e "${YELLOW}4. Executando SonarScanner...${NC}"

if command -v sonar-scanner &> /dev/null; then
    sonar-scanner \
        -Dsonar.projectBaseDir=. \
        -Dsonar.sources=src \
        -Dsonar.tests=src \
        -Dsonar.test.inclusions="**/*.test.js,**/*.spec.js" \
        -Dsonar.testExecutionReportPaths=test-results.xml \
        -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
        -Dsonar.coverage.reportPaths=coverage \
        -Dsonar.projectKey=11soat-hackton-videoslice_fe-video-slice \
        -Dsonar.projectName=fe-video-slice \
        -Dsonar.projectVersion=1.0 \
        -Dsonar.sources.encoding=UTF-8 \
        -Dsonar.host.url=$SONAR_HOST_URL \
        -Dsonar.login=$SONAR_TOKEN

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SonarScanner executado com sucesso${NC}"
    else
        echo -e "${RED}✗ Erro ao executar SonarScanner${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Aviso: sonar-scanner não está instalado${NC}"
    echo "Instale com: npm install -g sonarqube-scanner"
fi

# 7. Relatório final
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Quality Gate Concluído!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Relatórios gerados:"
echo "  - Cobertura: coverage/index.html"
echo "  - Testes: test-results.xml"
echo ""
