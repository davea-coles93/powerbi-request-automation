#!/bin/bash
# =============================================================================
# Azure Infrastructure Setup for Ontology Investigation
#
# Creates: Resource Group, Container Registry, Container Apps Environment,
#          and Container Apps for backend + frontend.
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Subscription selected (az account set -s <sub-id>)
#
# Usage:
#   chmod +x setup-azure.sh
#   ./setup-azure.sh                    # Uses defaults
#   ./setup-azure.sh -e prod -l uksouth # Override environment and location
# =============================================================================

set -euo pipefail

# --- Defaults (override with flags) ---
ENVIRONMENT="dev"
LOCATION="uksouth"
PROJECT="ontology"

while getopts "e:l:p:" opt; do
  case $opt in
    e) ENVIRONMENT="$OPTARG" ;;
    l) LOCATION="$OPTARG" ;;
    p) PROJECT="$OPTARG" ;;
    *) echo "Usage: $0 [-e environment] [-l location] [-p project]" && exit 1 ;;
  esac
done

# --- Derived names ---
RESOURCE_GROUP="rg-${PROJECT}-${ENVIRONMENT}"
ACR_NAME="${PROJECT}${ENVIRONMENT}acr"       # Must be alphanumeric, globally unique
CONTAINER_ENV="cae-${PROJECT}-${ENVIRONMENT}"
BACKEND_APP="ca-${PROJECT}-backend-${ENVIRONMENT}"
FRONTEND_APP="ca-${PROJECT}-frontend-${ENVIRONMENT}"

echo "========================================="
echo "  Ontology Investigation - Azure Setup"
echo "========================================="
echo "  Environment:    $ENVIRONMENT"
echo "  Location:       $LOCATION"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  ACR:            $ACR_NAME"
echo "========================================="
echo ""

# --- Resource Group ---
echo ">>> Creating Resource Group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# --- Azure Container Registry ---
echo ">>> Creating Container Registry: $ACR_NAME"
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

echo "    Login server: $ACR_LOGIN_SERVER"

# --- Container Apps Environment ---
echo ">>> Creating Container Apps Environment: $CONTAINER_ENV"
az containerapp env create \
  --name "$CONTAINER_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# --- Backend Container App ---
echo ">>> Creating Backend Container App: $BACKEND_APP"
az containerapp create \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_ENV" \
  --image "mcr.microsoft.com/azurelinux/base/nginx:1.25" \
  --target-port 8000 \
  --ingress internal \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --output none

BACKEND_FQDN=$(az containerapp show \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo "    Backend FQDN: $BACKEND_FQDN"

# --- Frontend Container App ---
echo ">>> Creating Frontend Container App: $FRONTEND_APP"
az containerapp create \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_ENV" \
  --image "mcr.microsoft.com/azurelinux/base/nginx:1.25" \
  --target-port 80 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --env-vars "BACKEND_FQDN=$BACKEND_FQDN" \
  --output none

FRONTEND_FQDN=$(az containerapp show \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo "  Frontend URL: https://$FRONTEND_FQDN"
echo "  Backend URL:  https://$BACKEND_FQDN (internal)"
echo "  ACR Server:   $ACR_LOGIN_SERVER"
echo ""
echo "  Next steps:"
echo "  1. Create an Azure DevOps service connection to this subscription"
echo "  2. Create a variable group 'ontology-<env>' with:"
echo "     - AZURE_SUBSCRIPTION:   your Azure subscription name or ID"
echo "     - ACR_NAME:             $ACR_NAME"
echo "     - RESOURCE_GROUP:       $RESOURCE_GROUP"
echo "     - BACKEND_APP_NAME:     $BACKEND_APP"
echo "     - FRONTEND_APP_NAME:    $FRONTEND_APP"
echo "     - CONTAINER_ENV:        $CONTAINER_ENV"
echo "     - ANTHROPIC_API_KEY:    (secret) your Anthropic API key"
echo "  3. Point the pipeline at azure-pipelines.yml"
echo "========================================="
